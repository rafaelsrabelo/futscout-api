import type { TeamHistory } from '../../../../generated/prisma/client.js'
import type { TeamHistoryRepository } from '../../repositories/team-history-repository.js'
import type { TeamRepository } from '../../repositories/team-repository.js'

import { InvalidTeamHistoryPeriodError } from './errors/invalid-team-history-period-error.js'
import { TeamHistoryNotFoundError } from './errors/team-history-not-found-error.js'
import { TeamNotFoundError } from './errors/team-not-found-error.js'

export interface UpdateTeamHistoryAdminUseCaseRequest {
  teamHistoryId: string
  teamId?: string
  startDate?: Date
  endDate?: Date | null
}

export class UpdateTeamHistoryAdminUseCase {
  constructor(
    private teamHistoryRepository: TeamHistoryRepository,
    private teamRepository: TeamRepository,
  ) {}

  async execute(
    request: UpdateTeamHistoryAdminUseCaseRequest,
  ): Promise<TeamHistory> {
    const existing = await this.teamHistoryRepository.findById(
      request.teamHistoryId,
    )
    if (!existing) throw new TeamHistoryNotFoundError()

    if (request.teamId) {
      const team = await this.teamRepository.findById(request.teamId)
      if (!team) throw new TeamNotFoundError()
    }

    const startDate = request.startDate ?? existing.startDate
    const endDate =
      request.endDate === undefined ? existing.endDate : request.endDate

    if (endDate && startDate >= endDate) {
      throw new InvalidTeamHistoryPeriodError()
    }

    const data: {
      team?: { connect: { id: string } }
      startDate?: Date
      endDate?: Date | null
    } = {}
    if (request.teamId) data.team = { connect: { id: request.teamId } }
    if (request.startDate !== undefined) data.startDate = request.startDate
    if (request.endDate !== undefined) data.endDate = request.endDate

    return this.teamHistoryRepository.update(request.teamHistoryId, data)
  }
}

export {
  InvalidTeamHistoryPeriodError,
  TeamHistoryNotFoundError,
  TeamNotFoundError,
}
