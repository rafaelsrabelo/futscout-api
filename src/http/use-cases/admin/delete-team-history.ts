import type { TeamHistoryRepository } from '../../repositories/team-history-repository.js'

import { TeamHistoryNotFoundError } from './errors/team-history-not-found-error.js'

interface Input {
  teamHistoryId: string
}

export class DeleteTeamHistoryAdminUseCase {
  constructor(private teamHistoryRepository: TeamHistoryRepository) {}

  async execute({ teamHistoryId }: Input): Promise<void> {
    const existing = await this.teamHistoryRepository.findById(teamHistoryId)
    if (!existing) throw new TeamHistoryNotFoundError()
    await this.teamHistoryRepository.delete(teamHistoryId)
  }
}

export { TeamHistoryNotFoundError }
