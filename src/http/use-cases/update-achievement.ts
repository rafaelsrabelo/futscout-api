import type { AchievementRepository } from '../repositories/achievement-repository.js'
import type { AthleteProfileRepository } from '../repositories/athlete-profile-repository.js'

interface UpdateAchievementRequest {
  userId: string
  achievementId: string
  name?: string
  category?: string
  year?: number
  type?: 'COLLECTIVE' | 'INDIVIDUAL'
}

interface UpdateAchievementResponse {
  achievement: {
    id: string
    name: string
    category: string
    year: number
    type: 'COLLECTIVE' | 'INDIVIDUAL'
    updatedAt: Date
  }
}

class AthleteProfileNotFoundError extends Error {
  constructor() {
    super('Athlete profile not found')
    this.name = 'AthleteProfileNotFoundError'
  }
}

class AchievementNotFoundError extends Error {
  constructor() {
    super('Achievement not found')
    this.name = 'AchievementNotFoundError'
  }
}

class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized to update this achievement')
    this.name = 'UnauthorizedError'
  }
}

export class UpdateAchievementUseCase {
  constructor(
    private achievementRepository: AchievementRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute(
    request: UpdateAchievementRequest,
  ): Promise<UpdateAchievementResponse> {
    // Buscar perfil do atleta
    const athleteProfile =
      await this.athleteProfileRepository.findByUserId(request.userId)

    if (!athleteProfile) {
      throw new AthleteProfileNotFoundError()
    }

    // Buscar achievement
    const achievement = await this.achievementRepository.findById(
      request.achievementId,
    )

    if (!achievement) {
      throw new AchievementNotFoundError()
    }

    // Verificar se o achievement pertence ao atleta
    if (achievement.athleteId !== athleteProfile.id) {
      throw new UnauthorizedError()
    }

    // Validar ano se fornecido
    if (request.year !== undefined) {
      const currentYear = new Date().getFullYear()
      if (request.year < 1900 || request.year > currentYear + 1) {
        throw new Error('Ano inválido')
      }
    }

    // Atualizar achievement
    const updatedAchievement = await this.achievementRepository.update(
      request.achievementId,
      {
        name: request.name,
        category: request.category,
        year: request.year,
        type: request.type,
      },
    )

    return {
      achievement: {
        id: updatedAchievement.id,
        name: updatedAchievement.name,
        category: updatedAchievement.category,
        year: updatedAchievement.year,
        type: updatedAchievement.type,
        updatedAt: updatedAchievement.updatedAt,
      },
    }
  }
}

export { AthleteProfileNotFoundError, AchievementNotFoundError, UnauthorizedError }

