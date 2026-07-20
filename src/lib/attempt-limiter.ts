/**
 * Contador de tentativas em memória, usado para conter força bruta na
 * verificação de códigos de 6 dígitos (1.000.000 de combinações, mas apenas
 * ~10^6/2 tentativas médias — sem limite, um atacante quebraria o código dentro
 * da janela de 15 minutos).
 *
 * LIMITAÇÃO CONHECIDA: o estado vive no processo. Ele NÃO sobrevive a um
 * restart e NÃO é compartilhado entre instâncias — com múltiplos réplicas o
 * limite efetivo é `maxAttempts * nº de instâncias`. O projeto ainda não tem
 * `@fastify/rate-limit` nem Redis; quando um deles entrar, este módulo deve ser
 * substituído por um limitador distribuído (por IP + por email).
 *
 * Mitigação adicional já aplicada no fluxo: ao estourar o limite, o código
 * pendente é invalidado no banco (ver `verify-password-reset-code.ts`), o que
 * encerra o ataque mesmo que o contador em memória seja perdido.
 */
export class AttemptLimiter {
  private attempts = new Map<string, { count: number; expiresAt: number }>()

  constructor(
    private maxAttempts: number = 5,
    private windowInMinutes: number = 15,
  ) {}

  private purgeIfExpired(key: string) {
    const entry = this.attempts.get(key)

    if (entry && entry.expiresAt <= Date.now()) {
      this.attempts.delete(key)
    }
  }

  /** Registra uma tentativa errada e devolve true se o limite foi atingido. */
  registerFailure(key: string): boolean {
    this.purgeIfExpired(key)

    const entry = this.attempts.get(key)
    const count = (entry?.count ?? 0) + 1
    const expiresAt =
      entry?.expiresAt ?? Date.now() + this.windowInMinutes * 60 * 1000

    this.attempts.set(key, { count, expiresAt })

    return count >= this.maxAttempts
  }

  /** True se a chave já estourou o limite dentro da janela atual. */
  isBlocked(key: string): boolean {
    this.purgeIfExpired(key)

    const entry = this.attempts.get(key)

    return entry ? entry.count >= this.maxAttempts : false
  }

  /** Zera o contador — chamado em acerto ou ao emitir um novo código. */
  reset(key: string): void {
    this.attempts.delete(key)
  }
}

// Instância compartilhada do fluxo de reset de senha.
export const passwordResetAttemptLimiter = new AttemptLimiter(5, 15)
