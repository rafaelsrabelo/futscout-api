import type { AchievementRepository } from '../repositories/achievement-repository.js'
import type { AthleteProfileRepository } from '../repositories/athlete-profile-repository.js'

interface ListAchievementsRequest {
  userId: string
}

interface ListAchievementsResponse {
  achievements: Array<{
    id: string
    name: string
    category: string
    year: number
    type: 'COLLECTIVE' | 'INDIVIDUAL'
    createdAt: Date
    updatedAt: Date
  }>
}

class AthleteProfileNotFoundError extends Error {
  constructor() {
    super('Athlete profile not found')
    this.name = 'AthleteProfileNotFoundError'
  }
}

export class ListAchievementsUseCase {
  constructor(
    private achievementRepository: AchievementRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute(
    request: ListAchievementsRequest,
  ): Promise<ListAchievementsResponse> {
    // Buscar perfil do atleta
    const athleteProfile =
      await this.athleteProfileRepository.findByUserId(request.userId)

    if (!athleteProfile) {
      throw new AthleteProfileNotFoundError()
    }

    // Buscar achievements do atleta
    const achievements = await this.achievementRepository.findByAthleteId(
      athleteProfile.id,
    )

    return {
      achievements: achievements.map((achievement) => ({
        id: achievement.id,
        name: achievement.name,
        category: achievement.category,
        year: achievement.year,
        type: achievement.type,
        createdAt: achievement.createdAt,
        updatedAt: achievement.updatedAt,
      })),
    }
  }
}

export { AthleteProfileNotFoundError }

