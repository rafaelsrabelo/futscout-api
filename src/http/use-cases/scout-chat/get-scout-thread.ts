import type {
  ScoutChatRepository,
  ScoutMessageToolCall,
} from '../../repositories/scout-chat-repository.js'
import type { AthleteSearchFilters } from '../../repositories/saved-search-repository.js'
import { ScoutThreadNotFoundError } from '../errors/scout-thread-not-found-error.js'
import { buildFilterSummary } from './filter-summary.js'
import type { AthleteCard } from './tools/tool-types.js'

interface GetScoutThreadRequest {
  threadId: string
  userId: string
}

interface ScoutThreadMessage {
  id: string
  role: string
  content: string
  /** Snapshot dos cards do turno — a conversa reabre sem refazer a busca. */
  items: AthleteCard[]
  responseType: string | null
  /**
   * Filtros DESTE turno. Cada busca da conversa vira um bloco próprio que o
   * observador pode ver e salvar; antes tudo colapsava num valor só e o
   * histórico perdia qual filtro era qual.
   */
  appliedFilters: AthleteSearchFilters | null
  filterSummary: string | null
  savedSearchId: string | null
  createdAt: Date
}

interface GetScoutThreadResponse {
  thread: {
    id: string
    title: string | null
    status: string
    createdAt: Date
    updatedAt: Date
  }
  messages: ScoutThreadMessage[]
  /** Critérios valendo no fim da conversa, para o app continuar do mesmo ponto. */
  appliedFilters: AthleteSearchFilters | null
}

export class GetScoutThreadUseCase {
  constructor(private scoutChatRepository: ScoutChatRepository) {}

  async execute({
    threadId,
    userId,
  }: GetScoutThreadRequest): Promise<GetScoutThreadResponse> {
    const thread = await this.scoutChatRepository.findThreadById(threadId)

    if (!thread || thread.userId !== userId) {
      throw new ScoutThreadNotFoundError()
    }

    const messages =
      await this.scoutChatRepository.findMessagesByThreadId(threadId)

    let appliedFilters: AthleteSearchFilters | null = null

    const mapped = messages
      // TOOL é registro interno do turno; a conversa exibida é só o diálogo.
      .filter((message) => message.role !== 'TOOL')
      .map((message) => {
        const toolCall = message.toolCall as ScoutMessageToolCall | null

        if (toolCall?.appliedFilters) {
          appliedFilters = toolCall.appliedFilters
        }

        const messageFilters = toolCall?.appliedFilters ?? null

        return {
          id: message.id,
          role: message.role,
          content: message.content,
          items: (message.cards as AthleteCard[] | null) ?? [],
          responseType: toolCall?.responseType ?? null,
          appliedFilters: messageFilters,
          filterSummary: buildFilterSummary(messageFilters),
          savedSearchId: toolCall?.savedSearchId ?? null,
          createdAt: message.createdAt,
        }
      })

    return {
      thread: {
        id: thread.id,
        title: thread.title,
        status: thread.status,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
      },
      messages: mapped,
      appliedFilters,
    }
  }
}
