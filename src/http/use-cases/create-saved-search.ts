import type { SavedSearch } from '../../../generated/prisma/client.js'
import type {
  SavedSearchRepository,
  AthleteSearchFilters,
} from '../repositories/saved-search-repository.js'

interface CreateSavedSearchRequest {
  userId: string
  title: string
  description?: string
  filters: AthleteSearchFilters
}

interface CreateSavedSearchResponse {
  savedSearch: SavedSearch
}

export class CreateSavedSearchUseCase {
  constructor(private savedSearchRepository: SavedSearchRepository) {}

  async execute({
    userId,
    title,
    description,
    filters,
  }: CreateSavedSearchRequest): Promise<CreateSavedSearchResponse> {
    // Validar se o título não está vazio
    if (!title.trim()) {
      throw new Error('Title is required')
    }

    // Validar se há pelo menos um filtro
    const hasFilters = Object.keys(filters).length > 0
    if (!hasFilters) {
      throw new Error('At least one filter is required')
    }

    const savedSearch = await this.savedSearchRepository.create({
      userId,
      title: title.trim(),
      description: description?.trim() || null,
      filters,
      isActive: true,
    })

    return {
      savedSearch,
    }
  }
}
