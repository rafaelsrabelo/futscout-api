import {
  Expo,
  type ExpoPushMessage,
  type ExpoPushTicket,
} from 'expo-server-sdk'

export type { ExpoPushMessage, ExpoPushTicket }

export interface ExpoPushSendResult {
  tickets: ExpoPushTicket[]
  invalidTokens: string[]
  successCount: number
  failureCount: number
}

// Permite injetar um sender alternativo em testes. Cada mensagem expõe `to` que
// pode ser string | string[]; em produção sempre passamos `to: string`.
export interface ExpoPushSender {
  chunkPushNotifications(messages: ExpoPushMessage[]): ExpoPushMessage[][]
  sendPushNotificationsAsync(
    chunk: ExpoPushMessage[],
  ): Promise<ExpoPushTicket[]>
  isExpoPushToken(token: unknown): boolean
}

class RealExpoSender implements ExpoPushSender {
  private readonly expo: Expo

  constructor(accessToken?: string) {
    this.expo = new Expo({ accessToken })
  }

  chunkPushNotifications(messages: ExpoPushMessage[]) {
    return this.expo.chunkPushNotifications(messages)
  }

  sendPushNotificationsAsync(chunk: ExpoPushMessage[]) {
    return this.expo.sendPushNotificationsAsync(chunk)
  }

  isExpoPushToken(token: unknown) {
    return Expo.isExpoPushToken(token)
  }
}

let defaultSender: ExpoPushSender | null = null
function getDefaultSender(): ExpoPushSender {
  if (!defaultSender) {
    // Lê direto de process.env pra evitar importar `@/env` no top-level
    // (o módulo `env` valida em load e quebra suites de teste que não
    // precisam de credenciais de admin).
    defaultSender = new RealExpoSender(process.env.EXPO_ACCESS_TOKEN)
  }
  return defaultSender
}

/**
 * Envia mensagens push em chunks via Expo. Retorna contadores e a lista de
 * tokens inválidos (DeviceNotRegistered) que o caller deve remover do banco.
 *
 * Mensagens cujo `to` não é um ExpoPushToken válido são descartadas
 * silenciosamente (não entram em `successCount` nem em `failureCount`).
 */
export async function sendExpoPushNotifications(
  messages: ExpoPushMessage[],
  sender: ExpoPushSender = getDefaultSender(),
): Promise<ExpoPushSendResult> {
  const valid = messages.filter((m) => {
    const to = m.to
    if (typeof to === 'string') return sender.isExpoPushToken(to)
    if (Array.isArray(to)) return to.every((t) => sender.isExpoPushToken(t))
    return false
  })

  if (valid.length === 0) {
    return { tickets: [], invalidTokens: [], successCount: 0, failureCount: 0 }
  }

  const chunks = sender.chunkPushNotifications(valid)
  const tickets: ExpoPushTicket[] = []

  for (const chunk of chunks) {
    try {
      const chunkTickets = await sender.sendPushNotificationsAsync(chunk)
      tickets.push(...chunkTickets)
    } catch (err) {
      // Chunk inteiro falhou (ex.: rede). Marca todos como erro virtual pra
      // o contador refletir, mas não derruba o envio dos próximos chunks.
      for (let i = 0; i < chunk.length; i++) {
        tickets.push({
          status: 'error',
          message: err instanceof Error ? err.message : 'unknown send error',
        } as ExpoPushTicket)
      }
    }
  }

  // Casa tickets com mensagens originais pra extrair o token do que falhou
  // por DeviceNotRegistered. A Expo garante 1 ticket por mensagem.
  const invalidTokens: string[] = []
  let successCount = 0
  let failureCount = 0

  // Reexpande mensagens na mesma ordem dos chunks pra alinhar com tickets.
  const orderedMessages: ExpoPushMessage[] = chunks.flat()

  tickets.forEach((ticket, idx) => {
    if (ticket.status === 'ok') {
      successCount++
      return
    }
    failureCount++
    if (
      ticket.status === 'error' &&
      ticket.details?.error === 'DeviceNotRegistered'
    ) {
      const to = orderedMessages[idx]?.to
      if (typeof to === 'string') invalidTokens.push(to)
      else if (Array.isArray(to)) invalidTokens.push(...to)
    }
  })

  return { tickets, invalidTokens, successCount, failureCount }
}

export function isExpoPushToken(token: unknown): boolean {
  return Expo.isExpoPushToken(token)
}
