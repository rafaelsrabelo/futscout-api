import type {
  Achievement,
  AchievementType,
  Prisma,
} from '../../../generated/prisma/client.js'

export interface AdminAthleteAchievementFilters {
  type?: AchievementType
  year?: number
}

export interface AdminAthleteAchievementPagination {
  page: number
  pageSize: number
}

export interface AchievementRepository {
  create(data: Prisma.AchievementCreateInput): Promise<Achievement>
  findById(id: string): Promise<Achievement | null>
  findByAthleteId(athleteId: string): Promise<Achievement[]>
  findManyByAthleteForAdmin(
    athleteProfileId: string,
    filters: AdminAthleteAchievementFilters,
    pagination: AdminAthleteAchievementPagination,
  ): Promise<{ items: Achievement[]; total: number }>
  update(id: string, data: Prisma.AchievementUpdateInput): Promise<Achievement>
  delete(id: string): Promise<void>
}
