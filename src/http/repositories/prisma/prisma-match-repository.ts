import type { Match, Prisma } from '../../../../generated/prisma/client.js'
import { prisma } from '../../../lib/prisma.js'
import type { MatchRepository } from '../match-repository.js'

export class PrismaMatchRepository implements MatchRepository {
  async create(data: Prisma.MatchCreateInput): Promise<Match> {
    return prisma.match.create({
      data,
    })
  }

  async findById(id: string): Promise<Match | null> {
    return prisma.match.findUnique({
      where: { id },
    })
  }

  async findByAthlete(athleteId: string): Promise<Match[]> {
    return prisma.match.findMany({
      where: { athleteId },
      orderBy: { date: 'desc' },
    })
  }

  async update(id: string, data: Prisma.MatchUpdateInput): Promise<Match> {
    return prisma.match.update({
      where: { id },
      data,
    })
  }

  async delete(id: string): Promise<void> {
    await prisma.match.delete({
      where: { id },
    })
  }

  async findByAthleteWithPlays(athleteId: string): Promise<Match[]> {
    return prisma.match.findMany({
      where: { athleteId },
      include: {
        plays: {
          orderBy: { approximateTime: 'asc' },
        },
      },
      orderBy: { date: 'desc' },
    })
  }

  async findByIdWithPlays(id: string): Promise<Match | null> {
    return prisma.match.findUnique({
      where: { id },
      include: {
        plays: {
          orderBy: { approximateTime: 'asc' },
        },
      },
    })
  }
}
