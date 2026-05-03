import type { AchievementRepository } from '../../repositories/achievement-repository.js'

import { AchievementNotFoundError } from './errors/achievement-not-found-error.js'

interface Input {
  achievementId: string
}

export class DeleteAchievementAdminUseCase {
  constructor(private achievementRepository: AchievementRepository) {}

  async execute({ achievementId }: Input): Promise<void> {
    const existing = await this.achievementRepository.findById(achievementId)
    if (!existing) throw new AchievementNotFoundError()
    await this.achievementRepository.delete(achievementId)
  }
}

export { AchievementNotFoundError }
