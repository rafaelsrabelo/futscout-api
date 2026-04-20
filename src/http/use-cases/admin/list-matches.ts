import type {
  AdminGlobalMatchFilters,
  AdminGlobalMatchListItem,
  MatchRepository,
} from '../../repositories/match-repository.js'

interface Input extends AdminGlobalMatchFilters {
  page?: number
  pageSize?: number
}

interface Output {
  items: AdminGlobalMatchListItem[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

export class ListMatchesAdminUseCase {
  constructor(private matchRepository: MatchRepository) {}

  async execute(input: Input): Promise<Output> {
    const page = input.page ?? 1
    const pageSize = input.pageSize ?? 20

    const { items, total } = await this.matchRepository.findManyGlobalForAdmin(
      {
        q: input.q,
        athleteId: input.athleteId,
        primaryPosition: input.primaryPosition,
        minAge: input.minAge,
        maxAge: input.maxAge,
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
