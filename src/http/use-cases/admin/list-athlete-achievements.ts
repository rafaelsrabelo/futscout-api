import type { Achievement } from '../../../../generated/prisma/client.js'
import type {
  AchievementRepository,
  AdminAthleteAchievementFilters,
} from '../../repositories/achievement-repository.js'
import type { AthleteProfileRepository } from '../../repositories/athlete-profile-repository.js'
import { AthleteNotFoundError } from './list-athlete-matches.js'

interface Input extends AdminAthleteAchievementFilters {
  athleteProfileId: string
  page?: number
  pageSize?: number
}

interface Output {
  items: Achievement[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

export class ListAthleteAchievementsAdminUseCase {
  constructor(
    private achievementRepository: AchievementRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute(input: Input): Promise<Output> {
    const page = input.page ?? 1
    const pageSize = input.pageSize ?? 20

    const athlete = await this.athleteProfileRepository.findById(
      input.athleteProfileId,
    )
    if (!athlete) throw new AthleteNotFoundError()

    const { items, total } =
      await this.achievementRepository.findManyByAthleteForAdmin(
        input.athleteProfileId,
        { type: input.type, year: input.year },
        { page, pageSize },
      )

    return { items, page, pageSize, total, hasMore: page * pageSize < total }
  }
}
