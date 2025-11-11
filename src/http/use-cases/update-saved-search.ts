import type { SavedSearch } from '../../../generated/prisma/client.js'
import type {
  SavedSearchRepository,
  UpdateSavedSearchData,
} from '../repositories/saved-search-repository.js'
import { SavedSearchNotFoundError } from './errors/saved-search-not-found-error.js'
import { UnauthorizedError } from './errors/unauthorized-error.js'

interface UpdateSavedSearchRequest {
  id: string
  userId: string
  title?: string
  description?: string | null
  filters?: {
    gender?: 'MALE' | 'FEMALE' | 'OTHER'
    dominantFoot?: 'RIGHT' | 'LEFT'
    primaryPosition?: 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD'
    currentClub?: string
    nickname?: string
    name?: string
    hasManager?: boolean
    minHeight?: number
    maxHeight?: number
    minWeight?: number
    maxWeight?: number
  }
  isActive?: boolean
}

interface UpdateSavedSearchResponse {
  savedSearch: SavedSearch
}

export class UpdateSavedSearchUseCase {
  constructor(private savedSearchRepository: SavedSearchRepository) {}

  async execute({
    id,
    userId,
    title,
    description,
    filters,
    isActive,
  }: UpdateSavedSearchRequest): Promise<UpdateSavedSearchResponse> {
    // Verificar se a busca existe
    const existingSavedSearch = await this.savedSearchRepository.findById(id)

    if (!existingSavedSearch) {
      throw new SavedSearchNotFoundError()
    }

    // Verificar se o usuário é o dono da busca
    if (existingSavedSearch.userId !== userId) {
      throw new UnauthorizedError()
    }

    // Preparar dados para atualização
    const updateData: UpdateSavedSearchData = {}

    if (title !== undefined) {
      updateData.title = title
    }

    if (description !== undefined) {
      updateData.description = description
    }

    if (filters !== undefined) {
      // Filtrar propriedades undefined
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== undefined),
      )
      updateData.filters = cleanFilters
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive
    }

    const savedSearch = await this.savedSearchRepository.update(id, updateData)

    return {
      savedSearch,
    }
  }
}
