import { randomUUID } from 'node:crypto'

import type {
  ScoutChatRepository,
  ScoutMessageToolCall,
} from '../../repositories/scout-chat-repository.js'
import type { AthleteSearchFilters } from '../../repositories/saved-search-repository.js'
import { ScoutThreadNotFoundError } from '../errors/scout-thread-not-found-error.js'
import type {
  ScoutHistoryEntry,
  ScoutLlmService,
} from './llm/scout-llm-service.js'
import { scoutLog } from './scout-log.js'
import type { ScoutResponseType } from './scout-output-schema.js'
import type { AthleteCard } from './tools/tool-types.js'

/**
 * Turnos de histórico enviados ao modelo (pares usuário+assistente). Janela
 * curta de propósito: conversa de busca é objetiva e cada mensagem antiga é
 * input pago em todos os turnos seguintes.
 */
const HISTORY_WINDOW_TURNS = 4

/** Quantas mensagens do assistente varremos atrás dos filtros que valiam. */
const TOOL_CALL_LOOKBACK = 3

const MAX_TITLE_LENGTH = 60

interface SendScoutMessageRequest {
  userId: string
  message: string
  threadId?: string
}

interface SendScoutMessageResponse {
  threadId: string
  turnId: string
  response: string
  responseType: ScoutResponseType
  items: AthleteCard[]
  /** Critérios valendo ao fim do turno — o que o app mostra como "filtro atual". */
  appliedFilters: AthleteSearchFilters | null
  savedSearchId: string | null
  meta: {
    tokensUsed: number
    cachedTokens: number
  }
}

export class SendScoutMessageUseCase {
  constructor(
    private scoutChatRepository: ScoutChatRepository,
    private llm: ScoutLlmService,
  ) {}

  async execute({
    userId,
    message,
    threadId,
  }: SendScoutMessageRequest): Promise<SendScoutMessageResponse> {
    const thread = await this.resolveThread(userId, threadId)
    const turnId = randomUUID()

    // Grava a pergunta ANTES de chamar o modelo: se a chamada falhar, o
    // histórico da conversa não fica com um buraco.
    await this.scoutChatRepository.createMessage({
      threadId: thread.id,
      role: 'USER',
      content: message,
    })

    const [history, previousToolCalls] = await Promise.all([
      this.loadHistory(thread.id),
      this.scoutChatRepository.findRecentAssistantToolCalls(
        thread.id,
        TOOL_CALL_LOOKBACK,
      ),
    ])

    const previousFilters = findLatestAppliedFilters(previousToolCalls)

    const turn = await this.llm.runTurn({
      userMessage: message,
      history,
      contextBlock: buildContextBlock(previousFilters, previousToolCalls),
      userId,
      turnId,
      standingFilters: previousFilters,
    })

    // Filtros do turno, ou os que já valiam quando o modelo só conversou.
    const appliedFilters = turn.appliedFilters ?? previousFilters
    const responseType = resolveResponseType(
      turn.output.responseType,
      turn.cards,
      turn.savedSearchId,
    )

    const toolCall: ScoutMessageToolCall = {
      responseType,
      ...(appliedFilters ? { appliedFilters } : {}),
      ...(turn.savedSearchId ? { savedSearchId: turn.savedSearchId } : {}),
      ...(turn.cards.length
        ? { shownAthleteIds: turn.cards.map((card) => card.id) }
        : {}),
    }

    await this.scoutChatRepository.createMessage({
      threadId: thread.id,
      role: 'ASSISTANT',
      content: turn.output.response,
      toolCall,
      cards: turn.cards.length ? turn.cards : null,
      promptTokens: turn.promptTokens,
      completionTokens: turn.completionTokens,
      totalTokens: turn.totalTokens,
    })

    // Primeira mensagem da conversa nomeia a thread, para a listagem ter rótulo.
    if (!thread.title) {
      await this.scoutChatRepository.updateThread(thread.id, {
        title: buildTitle(message),
      })
    }

    // Fecho do turno em uma linha. `iterations=1` com `filters=null` é a
    // assinatura de "o modelo respondeu sem buscar" — a causa mais provável de
    // o app receber 200 e não mostrar atleta nenhum.
    scoutLog(
      `💬 scout-chat turn [${turnId}] thread=${thread.id} ` +
        `iterations=${turn.toolLoopIterations} responseType=${responseType} ` +
        `items=${turn.cards.length} filters=${JSON.stringify(appliedFilters)} ` +
        `tokens=${turn.totalTokens} responseLen=${turn.output.response.length}`,
    )

    return {
      threadId: thread.id,
      turnId,
      response: turn.output.response,
      responseType,
      items: turn.cards,
      appliedFilters,
      savedSearchId: turn.savedSearchId,
      meta: {
        tokensUsed: turn.totalTokens,
        cachedTokens: turn.cachedInputTokens,
      },
    }
  }

  private async resolveThread(userId: string, threadId?: string) {
    if (!threadId) {
      return this.scoutChatRepository.createThread({ userId })
    }

    const thread = await this.scoutChatRepository.findThreadById(threadId)

    // Thread de outro usuário responde igual a inexistente — ver o erro.
    if (!thread || thread.userId !== userId) {
      throw new ScoutThreadNotFoundError()
    }

    return thread
  }

  private async loadHistory(threadId: string): Promise<ScoutHistoryEntry[]> {
    const messages = await this.scoutChatRepository.findRecentMessages(
      threadId,
      // +1 porque a pergunta deste turno já está gravada e é enviada
      // separadamente como `userMessage`.
      HISTORY_WINDOW_TURNS * 2 + 1,
    )

    return messages.slice(0, -1).map((m) => ({
      role: m.role === 'USER' ? ('user' as const) : ('assistant' as const),
      content: m.content,
    }))
  }
}

/** Percorre do mais recente para o mais antigo até achar filtros gravados. */
function findLatestAppliedFilters(
  toolCalls: ScoutMessageToolCall[],
): AthleteSearchFilters | null {
  for (const toolCall of toolCalls) {
    const filters = toolCall?.appliedFilters

    if (filters && Object.keys(filters).length > 0) {
      return filters
    }
  }

  return null
}

/**
 * Reinjeta o que o modelo não carrega entre turnos: os critérios que já valiam
 * (para refinar em cima, regra 5 do prompt) e os ids que ele mostrou (para
 * detalhar um atleta sem inventar id).
 */
function buildContextBlock(
  previousFilters: AthleteSearchFilters | null,
  toolCalls: ScoutMessageToolCall[],
): string {
  const lines: string[] = []

  if (previousFilters) {
    lines.push(
      'Filtros que já estavam valendo nesta conversa (parta destes e altere ' +
        'só o que o observador pedir):',
      JSON.stringify(previousFilters),
    )
  }

  const shownIds = toolCalls.find(
    (toolCall) => toolCall?.shownAthleteIds?.length,
  )?.shownAthleteIds

  if (shownIds?.length) {
    lines.push(
      '',
      'athleteIds que você mostrou por último (use EXATAMENTE estes ao chamar ' +
        'get_athlete_details; nunca invente id):',
      shownIds.join(', '),
    )
  }

  return lines.join('\n')
}

/**
 * O tipo vem dos cards que o backend montou, não do rótulo do modelo: um
 * `responseType` errado dessincronizaria a UI. Sem cards, confiamos no modelo.
 */
function resolveResponseType(
  modelType: ScoutResponseType,
  cards: AthleteCard[],
  savedSearchId: string | null,
): ScoutResponseType {
  if (savedSearchId) return 'SEARCH_SAVED'

  if (cards.length > 1) return 'ATHLETE_LIST'
  if (cards.length === 1) {
    return modelType === 'ATHLETE_DETAIL' ? 'ATHLETE_DETAIL' : 'ATHLETE_LIST'
  }

  // Sem card não existe lista para renderizar, seja o que o modelo disse.
  if (modelType === 'ATHLETE_LIST' || modelType === 'ATHLETE_DETAIL') {
    return 'TEXT'
  }

  return modelType
}

function buildTitle(message: string): string {
  const normalized = message.trim().replace(/\s+/g, ' ')

  if (normalized.length <= MAX_TITLE_LENGTH) {
    return normalized
  }

  return `${normalized.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…`
}
