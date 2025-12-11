import type { AchievementRepository } from '../repositories/achievement-repository.js'
import type { AthleteProfileRepository } from '../repositories/athlete-profile-repository.js'

interface DeleteAchievementRequest {
  userId: string
  achievementId: string
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
    super('Unauthorized to delete this achievement')
    this.name = 'UnauthorizedError'
  }
}

export class DeleteAchievementUseCase {
  constructor(
    private achievementRepository: AchievementRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute(request: DeleteAchievementRequest): Promise<void> {
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

    // Deletar achievement
    await this.achievementRepository.delete(request.achievementId)
  }
}

export {
  AthleteProfileNotFoundError,
  AchievementNotFoundError,
  UnauthorizedError,
}

