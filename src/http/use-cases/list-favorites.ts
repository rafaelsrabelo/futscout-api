import type {
  FavoriteRepository,
  FavoriteFilters,
} from '../repositories/favorite-repository.js'

interface ListFavoritesUseCaseRequest {
  userId: string
  page?: number
  limit?: number
}

interface ListFavoritesUseCaseResponse {
  favorites: Awaited<ReturnType<FavoriteRepository['findFavoritesByUser']>>
}

export class ListFavoritesUseCase {
  constructor(private favoriteRepository: FavoriteRepository) {}

  async execute({
    userId,
    page = 1,
    limit = 20,
  }: ListFavoritesUseCaseRequest): Promise<ListFavoritesUseCaseResponse> {
    const filters: FavoriteFilters = {
      userId,
      page,
      limit,
    }

    const favorites = await this.favoriteRepository.findFavoritesByUser(filters)

    return { favorites }
  }
}