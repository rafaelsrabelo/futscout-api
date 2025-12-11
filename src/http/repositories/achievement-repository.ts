import type { Achievement, Prisma } from '../../../generated/prisma/client.js'

export interface AchievementRepository {
  create(data: Prisma.AchievementCreateInput): Promise<Achievement>
  findById(id: string): Promise<Achievement | null>
  findByAthleteId(athleteId: string): Promise<Achievement[]>
  update(id: string, data: Prisma.AchievementUpdateInput): Promise<Achievement>
  delete(id: string): Promise<void>
}

