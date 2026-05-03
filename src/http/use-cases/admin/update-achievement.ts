import type {
  Achievement,
  AchievementType,
} from '../../../../generated/prisma/client.js'
import type { AchievementRepository } from '../../repositories/achievement-repository.js'

import { AchievementNotFoundError } from './errors/achievement-not-found-error.js'

export interface UpdateAchievementAdminUseCaseRequest {
  achievementId: string
  name?: string
  category?: string
  year?: number
  type?: AchievementType
}

export class UpdateAchievementAdminUseCase {
  constructor(private achievementRepository: AchievementRepository) {}

  async execute(
    request: UpdateAchievementAdminUseCaseRequest,
  ): Promise<Achievement> {
    const existing = await this.achievementRepository.findById(
      request.achievementId,
    )
    if (!existing) throw new AchievementNotFoundError()

    const data: {
      name?: string
      category?: string
      year?: number
      type?: AchievementType
    } = {}
    if (request.name !== undefined) data.name = request.name
    if (request.category !== undefined) data.category = request.category
    if (request.year !== undefined) data.year = request.year
    if (request.type !== undefined) data.type = request.type

    return this.achievementRepository.update(request.achievementId, data)
  }
}

export { AchievementNotFoundError }
