import type { Achievement, Prisma } from '../../../../generated/prisma/client.js'
import { prisma } from '../../../lib/prisma.js'
import type {
  AchievementRepository,
  AdminAthleteAchievementFilters,
  AdminAthleteAchievementPagination,
} from '../achievement-repository.js'

export class PrismaAchievementRepository implements AchievementRepository {
  async create(data: Prisma.AchievementCreateInput): Promise<Achievement> {
    return prisma.achievement.create({
      data,
    })
  }

  async findById(id: string): Promise<Achievement | null> {
    return prisma.achievement.findUnique({
      where: { id },
    })
  }

  async findByAthleteId(athleteId: string): Promise<Achievement[]> {
    return prisma.achievement.findMany({
      where: { athleteId },
      orderBy: [
        { year: 'desc' },
        { createdAt: 'desc' },
      ],
    })
  }

  async findManyByAthleteForAdmin(
    athleteProfileId: string,
    filters: AdminAthleteAchievementFilters,
    pagination: AdminAthleteAchievementPagination,
  ): Promise<{ items: Achievement[]; total: number }> {
    const where: Prisma.AchievementWhereInput = {
      athleteId: athleteProfileId,
    }
    if (filters.type) where.type = filters.type
    if (filters.year) where.year = filters.year

    const [items, total] = await Promise.all([
      prisma.achievement.findMany({
        where,
        orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.achievement.count({ where }),
    ])

    return { items, total }
  }

  async update(id: string, data: Prisma.AchievementUpdateInput): Promise<Achievement> {
    return prisma.achievement.update({
      where: { id },
      data,
    })
  }

  async delete(id: string): Promise<void> {
    await prisma.achievement.delete({
      where: { id },
    })
  }
}

