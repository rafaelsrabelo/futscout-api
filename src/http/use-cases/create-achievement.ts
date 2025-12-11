import type { AchievementRepository } from '../repositories/achievement-repository.js'
import type { AthleteProfileRepository } from '../repositories/athlete-profile-repository.js'

interface CreateAchievementRequest {
  userId: string
  name: string
  category: string
  year: number
  type: 'COLLECTIVE' | 'INDIVIDUAL'
}

interface CreateAchievementResponse {
  achievement: {
    id: string
    name: string
    category: string
    year: number
    type: 'COLLECTIVE' | 'INDIVIDUAL'
    createdAt: Date
  }
}

class AthleteProfileNotFoundError extends Error {
  constructor() {
    super('Athlete profile not found')
    this.name = 'AthleteProfileNotFoundError'
  }
}

export class CreateAchievementUseCase {
  constructor(
    private achievementRepository: AchievementRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute(
    request: CreateAchievementRequest,
  ): Promise<CreateAchievementResponse> {
    // Buscar perfil do atleta
    const athleteProfile =
      await this.athleteProfileRepository.findByUserId(request.userId)

    if (!athleteProfile) {
      throw new AthleteProfileNotFoundError()
    }

    // Validar ano (deve ser entre 1900 e ano atual + 1)
    const currentYear = new Date().getFullYear()
    if (request.year < 1900 || request.year > currentYear + 1) {
      throw new Error('Ano inválido')
    }

    // Criar achievement
    const achievement = await this.achievementRepository.create({
      athlete: {
        connect: {
          id: athleteProfile.id,
        },
      },
      name: request.name,
      category: request.category,
      year: request.year,
      type: request.type,
    })

    return {
      achievement: {
        id: achievement.id,
        name: achievement.name,
        category: achievement.category,
        year: achievement.year,
        type: achievement.type,
        createdAt: achievement.createdAt,
      },
    }
  }
}

export { AthleteProfileNotFoundError }

