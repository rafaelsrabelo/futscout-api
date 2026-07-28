import type {
  ScoutMessage,
  ScoutThread,
} from '../../../generated/prisma/client.js'
import type { AthleteCard } from '../use-cases/scout-chat/tools/tool-types.js'
import type { AthleteSearchFilters } from './saved-search-repository.js'

/**
 * Payload gravado em `ScoutMessage.toolCall`. O campo importante é
 * `appliedFilters`: são os critérios que a busca REALMENTE aplicou. O turno
 * seguinte lê daqui para refinar, em vez de confiar no que o modelo relembra.
 */
export interface ScoutMessageToolCall {
  name?: string
  summary?: string
  responseType?: string
  appliedFilters?: AthleteSearchFilters
  savedSearchId?: string
  /** Ids mostrados no turno, para o modelo reusar em vez de inventar. */
  shownAthleteIds?: string[]
}

export interface CreateScoutThreadData {
  userId: string
  title?: string | null
}

export interface UpdateScoutThreadData {
  title?: string
  status?: 'OPEN' | 'CLOSED'
}

export interface CreateScoutMessageData {
  threadId: string
  role: 'USER' | 'ASSISTANT' | 'TOOL'
  content: string
  toolCall?: ScoutMessageToolCall | null
  cards?: AthleteCard[] | null
  promptTokens?: number | null
  completionTokens?: number | null
  totalTokens?: number | null
}

export interface ScoutChatRepository {
  createThread(data: CreateScoutThreadData): Promise<ScoutThread>
  findThreadById(id: string): Promise<ScoutThread | null>
  /** Conversas do observador, mais recentes primeiro. */
  findThreadsByUserId(userId: string): Promise<ScoutThread[]>
  updateThread(id: string, data: UpdateScoutThreadData): Promise<ScoutThread>

  createMessage(data: CreateScoutMessageData): Promise<ScoutMessage>
  /** Mensagens da thread em ordem cronológica (mais antiga primeiro). */
  findMessagesByThreadId(threadId: string): Promise<ScoutMessage[]>
  /**
   * Janela de histórico para o prompt: as `limit` mensagens USER/ASSISTANT mais
   * recentes, devolvidas já em ordem cronológica.
   */
  findRecentMessages(threadId: string, limit: number): Promise<ScoutMessage[]>
  /**
   * `toolCall` das últimas mensagens do assistente, da mais recente para a mais
   * antiga. De onde saem os `appliedFilters` que estavam valendo.
   */
  findRecentAssistantToolCalls(
    threadId: string,
    limit: number,
  ): Promise<ScoutMessageToolCall[]>
}
