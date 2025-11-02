import type { FavoriteRepository } from '../repositories/favorite-repository.js'
import type { AthleteProfileRepository } from '../repositories/athlete-profile-repository.js'

interface ToggleFavoriteUseCaseRequest {
  userId: string
  athleteId: string
}

interface ToggleFavoriteUseCaseResponse {
  isFavorited: boolean
}

export class ToggleFavoriteUseCase {
  constructor(
    private favoriteRepository: FavoriteRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute({
    userId,
    athleteId,
  }: ToggleFavoriteUseCaseRequest): Promise<ToggleFavoriteUseCaseResponse> {
    // Check if athlete exists
    const athlete = await this.athleteProfileRepository.findById(athleteId)
    if (!athlete) {
      throw new Error('Athlete not found')
    }

    // Prevent users from favoriting themselves
    if (athlete.userId === userId) {
      throw new Error('You cannot favorite your own profile')
    }

    const isFavorited = await this.favoriteRepository.toggleFavorite(
      userId,
      athleteId,
    )

    return { isFavorited }
  }
}
