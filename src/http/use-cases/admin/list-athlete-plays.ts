import type { AthleteProfileRepository } from '../../repositories/athlete-profile-repository.js'
import type {
  AdminAthletePlayFilters,
  AdminAthletePlayListItem,
  PlayRepository,
} from '../../repositories/play-repository.js'
import { AthleteNotFoundError } from './list-athlete-matches.js'

interface ListAthletePlaysAdminInput extends AdminAthletePlayFilters {
  athleteProfileId: string
  page?: number
  pageSize?: number
}

interface ListAthletePlaysAdminOutput {
  items: AdminAthletePlayListItem[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

export class ListAthletePlaysAdminUseCase {
  constructor(
    private playRepository: PlayRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute(
    input: ListAthletePlaysAdminInput,
  ): Promise<ListAthletePlaysAdminOutput> {
    const page = input.page ?? 1
    const pageSize = input.pageSize ?? 20

    const athlete = await this.athleteProfileRepository.findById(
      input.athleteProfileId,
    )
    if (!athlete) {
      throw new AthleteNotFoundError()
    }

    const { items, total } =
      await this.playRepository.findManyByAthleteForAdmin(
        input.athleteProfileId,
        {
          hasVideo: input.hasVideo,
          playType: input.playType,
          matchId: input.matchId,
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
