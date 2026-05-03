import type { AthleteProfileRepository } from '../../repositories/athlete-profile-repository.js'
import type {
  AdminTeamListItem,
  TeamRepository,
} from '../../repositories/team-repository.js'

import { AthleteNotFoundError } from './errors/athlete-not-found-error.js'

export interface ListTeamsAdminUseCaseRequest {
  q?: string
  athleteProfileId?: string
  page: number
  pageSize: number
}

export interface ListTeamsAdminUseCaseResponse {
  items: AdminTeamListItem[]
  total: number
  page: number
  pageSize: number
}

export class ListTeamsAdminUseCase {
  constructor(
    private teamRepository: TeamRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute(
    request: ListTeamsAdminUseCaseRequest,
  ): Promise<ListTeamsAdminUseCaseResponse> {
    let ownerUserId: string | undefined

    if (request.athleteProfileId) {
      const athlete = await this.athleteProfileRepository.findById(
        request.athleteProfileId,
      )
      if (!athlete) throw new AthleteNotFoundError()
      ownerUserId = athlete.userId
    }

    const { items, total } = await this.teamRepository.findManyForAdmin(
      { q: request.q, ownerUserId },
      { page: request.page, pageSize: request.pageSize },
    )

    return {
      items,
      total,
      page: request.page,
      pageSize: request.pageSize,
    }
  }
}

export { AthleteNotFoundError }
