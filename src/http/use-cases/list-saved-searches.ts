import type { SavedSearch } from '../../../generated/prisma/client.js'
import type { SavedSearchRepository } from '../repositories/saved-search-repository.js'

interface ListSavedSearchesRequest {
  userId: string
}

interface ListSavedSearchesResponse {
  savedSearches: SavedSearch[]
}

export class ListSavedSearchesUseCase {
  constructor(private savedSearchRepository: SavedSearchRepository) {}

  async execute({
    userId,
  }: ListSavedSearchesRequest): Promise<ListSavedSearchesResponse> {
    const savedSearches = await this.savedSearchRepository.findByUserId(userId)

    return {
      savedSearches,
    }
  }
}
