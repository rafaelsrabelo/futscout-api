import type { Achievement, Prisma } from '../../../../generated/prisma/client.js'
import { prisma } from '../../../lib/prisma.js'
import type { AchievementRepository } from '../achievement-repository.js'

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

