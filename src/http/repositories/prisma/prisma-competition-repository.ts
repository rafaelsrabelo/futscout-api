import type {
  Competition,
  Prisma,
} from '../../../../generated/prisma/client.js'
import { prisma } from '../../../lib/prisma.js'
import type { CompetitionRepository } from '../competition-repository.js'

export class PrismaCompetitionRepository implements CompetitionRepository {
  async create(data: Prisma.CompetitionCreateInput): Promise<Competition> {
    return prisma.competition.create({
      data,
    })
  }

  async findById(id: string): Promise<Competition | null> {
    return prisma.competition.findUnique({
      where: { id },
      include: {
        matches: {
          orderBy: { date: 'desc' },
        },
      },
    })
  }

  async findByAthleteId(athleteId: string): Promise<Competition[]> {
    return prisma.competition.findMany({
      where: { athleteId },
      include: {
        matches: {
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async update(
    id: string,
    data: Prisma.CompetitionUpdateInput,
  ): Promise<Competition> {
    return prisma.competition.update({
      where: { id },
      data,
    })
  }

  async delete(id: string): Promise<void> {
    await prisma.competition.delete({
      where: { id },
    })
  }
}

