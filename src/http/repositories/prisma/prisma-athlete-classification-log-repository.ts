import { prisma } from '@/lib/prisma.js'
import type {
  AthleteClassificationLogRepository,
  CreateAthleteClassificationLogData,
  ListAthleteClassificationLogsResponse,
} from '../athlete-classification-log-repository.js'

export class PrismaAthleteClassificationLogRepository
  implements AthleteClassificationLogRepository
{
  async create(data: CreateAthleteClassificationLogData) {
    return prisma.athleteClassificationLog.create({
      data: {
        athleteId: data.athleteId,
        classification: data.classification,
        comment: data.comment,
        classifiedById: data.classifiedById,
      },
    })
  }

  async listByAthleteId(
    athleteId: string,
    pagination: { page: number; pageSize: number },
  ): Promise<ListAthleteClassificationLogsResponse> {
    const { page, pageSize } = pagination
    const [items, total] = await Promise.all([
      prisma.athleteClassificationLog.findMany({
        where: { athleteId },
        include: {
          classifiedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.athleteClassificationLog.count({ where: { athleteId } }),
    ])

    return { items, total }
  }
}
