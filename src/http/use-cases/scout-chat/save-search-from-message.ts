import type { SavedSearch } from '../../../../generated/prisma/client.js'
import type {
  ScoutChatRepository,
  ScoutMessageToolCall,
} from '../../repositories/scout-chat-repository.js'
import type { SavedSearchRepository } from '../../repositories/saved-search-repository.js'
import { ScoutMessageNotFoundError } from '../errors/scout-message-not-found-error.js'
import { ScoutMessageHasNoFiltersError } from '../errors/scout-message-has-no-filters-error.js'

interface SaveSearchFromMessageRequest {
  messageId: string
  userId: string
  title: string
  description?: string
}

interface SaveSearchFromMessageResponse {
  savedSearch: SavedSearch
}

/**
 * Salva como SavedSearch os filtros de UM turno específico da conversa.
 *
 * É o caminho principal para salvar: o observador vê o bloco de filtro na tela
 * e salva aquele exato. Nenhuma chamada ao modelo acontece aqui — é
 * determinístico, instantâneo e de graça. A tool `save_search` continua
 * existindo para quem prefere pedir falando.
 */
export class SaveSearchFromMessageUseCase {
  constructor(
    private scoutChatRepository: ScoutChatRepository,
    private savedSearchRepository: SavedSearchRepository,
  ) {}

  async execute({
    messageId,
    userId,
    title,
    description,
  }: SaveSearchFromMessageRequest): Promise<SaveSearchFromMessageResponse> {
    const message = await this.scoutChatRepository.findMessageById(messageId)

    if (!message) {
      throw new ScoutMessageNotFoundError()
    }

    // A mensagem não carrega o dono; quem tem é a thread.
    const thread = await this.scoutChatRepository.findThreadById(
      message.threadId,
    )

    // Mensagem de conversa alheia responde igual a inexistente.
    if (!thread || thread.userId !== userId) {
      throw new ScoutMessageNotFoundError()
    }

    const toolCall = message.toolCall as ScoutMessageToolCall | null
    const filters = toolCall?.appliedFilters

    if (!filters || Object.keys(filters).length === 0) {
      throw new ScoutMessageHasNoFiltersError()
    }

    const savedSearch = await this.savedSearchRepository.create({
      userId,
      title,
      description: description ?? null,
      filters,
    })

    // Marca o turno como salvo para a conversa reabrir já refletindo isso.
    await this.scoutChatRepository.updateMessageToolCall(messageId, {
      ...toolCall,
      savedSearchId: savedSearch.id,
    })

    return { savedSearch }
  }
}
