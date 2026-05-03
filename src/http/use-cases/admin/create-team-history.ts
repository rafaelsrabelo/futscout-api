import type { TeamHistory } from '../../../../generated/prisma/client.js'
import type { AthleteProfileRepository } from '../../repositories/athlete-profile-repository.js'
import type { TeamHistoryRepository } from '../../repositories/team-history-repository.js'
import type { TeamRepository } from '../../repositories/team-repository.js'

import { AthleteNotFoundError } from './errors/athlete-not-found-error.js'
import { InvalidTeamHistoryPeriodError } from './errors/invalid-team-history-period-error.js'
import { TeamNotFoundError } from './errors/team-not-found-error.js'

export interface CreateTeamHistoryAdminUseCaseRequest {
  athleteProfileId: string
  teamId: string
  startDate: Date
  endDate?: Date | null
}

export class CreateTeamHistoryAdminUseCase {
  constructor(
    private teamHistoryRepository: TeamHistoryRepository,
    private athleteProfileRepository: AthleteProfileRepository,
    private teamRepository: TeamRepository,
  ) {}

  async execute(
    request: CreateTeamHistoryAdminUseCaseRequest,
  ): Promise<TeamHistory> {
    const athlete = await this.athleteProfileRepository.findById(
      request.athleteProfileId,
    )
    if (!athlete) throw new AthleteNotFoundError()

    const team = await this.teamRepository.findById(request.teamId)
    if (!team) throw new TeamNotFoundError()

    if (request.endDate && request.startDate >= request.endDate) {
      throw new InvalidTeamHistoryPeriodError()
    }

    return this.teamHistoryRepository.create({
      athlete: { connect: { id: request.athleteProfileId } },
      team: { connect: { id: request.teamId } },
      startDate: request.startDate,
      endDate: request.endDate ?? null,
    })
  }
}

export {
  AthleteNotFoundError,
  InvalidTeamHistoryPeriodError,
  TeamNotFoundError,
}
