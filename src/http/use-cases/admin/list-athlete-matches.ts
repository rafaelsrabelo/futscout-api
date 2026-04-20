import type {
  AdminMatchFilters,
  AdminMatchListItem,
  MatchRepository,
} from '../../repositories/match-repository.js'
import type { AthleteProfileRepository } from '../../repositories/athlete-profile-repository.js'

export class AthleteNotFoundError extends Error {
  constructor() {
    super('Atleta não encontrado.')
    this.name = 'AthleteNotFoundError'
  }
}

interface ListAthleteMatchesAdminInput extends AdminMatchFilters {
  athleteProfileId: string
  page?: number
  pageSize?: number
}

interface ListAthleteMatchesAdminOutput {
  items: AdminMatchListItem[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

export class ListAthleteMatchesAdminUseCase {
  constructor(
    private matchRepository: MatchRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute(
    input: ListAthleteMatchesAdminInput,
  ): Promise<ListAthleteMatchesAdminOutput> {
    const page = input.page ?? 1
    const pageSize = input.pageSize ?? 20

    const athlete = await this.athleteProfileRepository.findById(
      input.athleteProfileId,
    )
    if (!athlete) {
      throw new AthleteNotFoundError()
    }

    const { items, total } =
      await this.matchRepository.findManyByAthleteForAdmin(
        input.athleteProfileId,
        {
          competitionId: input.competitionId,
          status: input.status,
          result: input.result,
          from: input.from,
          to: input.to,
        },
        { page, pageSize },
      )

    return {
      items,
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
    }
  }
}
