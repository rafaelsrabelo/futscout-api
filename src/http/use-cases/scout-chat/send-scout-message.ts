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
import { buildFilterSummary, translatePosition } from './filter-summary.js'
import { scoutLog } from './scout-log.js'
import type { ScoutSessionContextProvider } from './scout-session-context.js'
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
  /** Id da mensagem do assistente — o app usa para salvar ESTE filtro. */
  messageId: string
  response: string
  responseType: ScoutResponseType
  items: AthleteCard[]
  /** Critérios valendo ao fim do turno — o que o app mostra como "filtro atual". */
  appliedFilters: AthleteSearchFilters | null
  /** Os mesmos filtros em texto, para o app renderizar o chip sem traduzir. */
  filterSummary: string | null
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
    /** Opcional: sem ele o turno roda igual, só sem a nota de sessão. */
    private sessionContext?: ScoutSessionContextProvider,
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

    // Em paralelo para a nota de sessão não somar latência ao turno.
    const [history, previousToolCalls, sessionNote] = await Promise.all([
      this.loadHistory(thread.id),
      this.scoutChatRepository.findRecentAssistantToolCalls(
        thread.id,
        TOOL_CALL_LOOKBACK,
      ),
      // Nota de sessão nunca derruba o turno: sem ela o chat funciona igual.
      this.sessionContext?.build(userId).catch(() => '') ?? Promise.resolve(''),
    ])

    const previousFilters = findLatestAppliedFilters(previousToolCalls)

    const turn = await this.llm.runTurn({
      userMessage: message,
      history,
      contextBlock: buildContextBlock(
        previousFilters,
        previousToolCalls,
        sessionNote,
      ),
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
        ? { shownAthletes: turn.cards.map(toShownAthlete) }
        : {}),
    }

    const assistantMessage = await this.scoutChatRepository.createMessage({
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
        `tokens=${turn.totalTokens} responseLen=${turn.output.response.length} ` +
        `model=${turn.model}`,
    )

    return {
      threadId: thread.id,
      turnId,
      messageId: assistantMessage.id,
      response: turn.output.response,
      responseType,
      items: turn.cards,
      appliedFilters,
      filterSummary: buildFilterSummary(appliedFilters),
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

/** Data por extenso em pt-BR, para o modelo raciocinar sobre idade e temporada. */
function formatToday(): string {
  return new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Rótulo curto do atleta para o contexto do próximo turno. Sem isto o modelo
 * recebe só o UUID e não consegue ligar "o segundo da lista" a ninguém.
 */
function toShownAthlete(card: AthleteCard): {
  athleteId: string
  label: string
} {
  const name = card.nickname?.trim() || card.name
  const details = [
    translatePosition(card.primaryPosition),
    card.age?.toString(),
  ]
    .filter(Boolean)
    .join(', ')

  return {
    athleteId: card.id,
    label: details ? `${name} (${details})` : name,
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
  sessionNote: string,
): string {
  const lines: string[] = []

  // Data de hoje: sem ela o modelo não resolve "sub-20 na próxima temporada"
  // nem "quem faz 18 este ano".
  lines.push(`Hoje é ${formatToday()}.`)

  if (sessionNote) {
    lines.push('', sessionNote)
  }

  if (previousFilters) {
    lines.push(
      '',
      'Filtros que já estavam valendo nesta conversa (parta destes e altere ' +
        'só o que o observador pedir):',
      JSON.stringify(previousFilters),
    )
  }

  const shown = toolCalls.find(
    (toolCall) =>
      toolCall?.shownAthletes?.length || toolCall?.shownAthleteIds?.length,
  )

  // `shownAthletes` é o formato atual; `shownAthleteIds` sobrevive nas threads
  // criadas antes e vira uma lista sem rótulo.
  const shownLines =
    shown?.shownAthletes?.map(
      (athlete, index) =>
        `${index + 1}. ${athlete.label} → ${athlete.athleteId}`,
    ) ??
    shown?.shownAthleteIds?.map(
      (athleteId, index) => `${index + 1}. ${athleteId}`,
    )

  if (shownLines?.length) {
    lines.push(
      '',
      'Atletas que você mostrou por último, na ordem em que apareceram. Use ' +
        'estes números quando o observador disser "o segundo", "o terceiro". ' +
        'Ao chamar get_athlete_details use EXATAMENTE o id ao lado; nunca ' +
        'invente id:',
      ...shownLines,
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
