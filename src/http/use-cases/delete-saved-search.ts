import type { SavedSearchRepository } from '../repositories/saved-search-repository.js'
import { SavedSearchNotFoundError } from './errors/saved-search-not-found-error.js'
import { UnauthorizedError } from './errors/unauthorized-error.js'

interface DeleteSavedSearchRequest {
  id: string
  userId: string
}

export class DeleteSavedSearchUseCase {
  constructor(private savedSearchRepository: SavedSearchRepository) {}

  async execute({ id, userId }: DeleteSavedSearchRequest): Promise<void> {
    // Verificar se a busca existe
    const existingSavedSearch = await this.savedSearchRepository.findById(id)

    if (!existingSavedSearch) {
      throw new SavedSearchNotFoundError()
    }

    // Verificar se o usuário é o dono da busca
    if (existingSavedSearch.userId !== userId) {
      throw new UnauthorizedError()
    }

    await this.savedSearchRepository.delete(id)
  }
}
