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
      include: {
        myTeam: true,
      },
    })
  }

  async findByAthlete(athleteId: string): Promise<Match[]> {
    return prisma.match.findMany({
      where: { athleteId },
      include: {
        myTeam: true,
      },
      orderBy: { date: 'desc' }, // Mais recentes primeiro
    }) as unknown as Match[]
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
          include: {
            classifications: true,
          },
          orderBy: { approximateTime: 'asc' }, // Lances por tempo do jogo
        },
      },
      orderBy: { date: 'desc' }, // Partidas mais recentes primeiro
    })
  }

  async findByIdWithPlays(id: string): Promise<Match | null> {
    return prisma.match.findUnique({
      where: { id },
      include: {
        plays: {
          include: {
            classifications: true,
          },
          orderBy: { approximateTime: 'asc' },
        },
      },
    })
  }

  async findByAthleteIdAndStatus(
    athleteId: string,
    status: string,
  ): Promise<Match[]> {
    return prisma.match.findMany({
      where: {
        athleteId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: status as any,
      },
      include: {
        myTeam: true,
      },
      orderBy: { date: 'desc' },
    }) as unknown as Match[]
  }
}
