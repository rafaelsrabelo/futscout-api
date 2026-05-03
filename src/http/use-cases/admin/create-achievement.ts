import type {
  Achievement,
  AchievementType,
} from '../../../../generated/prisma/client.js'
import type { AchievementRepository } from '../../repositories/achievement-repository.js'
import type { AthleteProfileRepository } from '../../repositories/athlete-profile-repository.js'

import { AthleteNotFoundError } from './errors/athlete-not-found-error.js'

export interface CreateAchievementAdminUseCaseRequest {
  athleteProfileId: string
  name: string
  category: string
  year: number
  type: AchievementType
}

export class CreateAchievementAdminUseCase {
  constructor(
    private achievementRepository: AchievementRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute(
    request: CreateAchievementAdminUseCaseRequest,
  ): Promise<Achievement> {
    const athlete = await this.athleteProfileRepository.findById(
      request.athleteProfileId,
    )
    if (!athlete) throw new AthleteNotFoundError()

    return this.achievementRepository.create({
      athlete: { connect: { id: request.athleteProfileId } },
      name: request.name,
      category: request.category,
      year: request.year,
      type: request.type,
    })
  }
}

export { AthleteNotFoundError }
