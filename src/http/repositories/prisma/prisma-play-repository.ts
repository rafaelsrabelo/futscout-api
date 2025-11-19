import type { Play, Prisma } from '../../../../generated/prisma/client.js'
import { prisma } from '../../../lib/prisma.js'
import type { PlayRepository } from '../play-repository.js'

export class PrismaPlayRepository implements PlayRepository {
  async create(data: Prisma.PlayCreateInput): Promise<Play> {
    return prisma.play.create({
      data,
    })
  }

  async findById(id: string): Promise<Play | null> {
    return prisma.play.findUnique({
      where: { id },
      include: {
        classifications: true,
        match: {
          select: {
            id: true,
            athleteId: true,
          },
        },
        athlete: {
          select: {
            id: true,
          },
        },
      },
    })
  }

  async findByMatch(matchId: string): Promise<Play[]> {
    return prisma.play.findMany({
      where: { matchId },
      include: {
        classifications: true,
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  async findManyByMatchId(matchId: string): Promise<Play[]> {
    return prisma.play.findMany({
      where: { matchId },
      include: {
        classifications: true,
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  async update(id: string, data: Prisma.PlayUpdateInput): Promise<Play> {
    return prisma.play.update({
      where: { id },
      data,
    })
  }

  async delete(id: string): Promise<void> {
    await prisma.play.delete({
      where: { id },
    })
  }

  async findVideosByAthleteId(athleteId: string): Promise<Play[]> {
    return prisma.play.findMany({
      where: {
        videoUrl: {
          not: null,
        },
        OR: [
          {
            match: {
              athleteId,
            },
          },
          {
            athleteId,
            matchId: null, // Lances sem partida
          },
        ],
      },
      include: {
        classifications: true,
        match: {
          select: {
            id: true,
            adversaryTeam: true,
            date: true,
            category: true,
          },
        },
        athlete: {
          select: {
            id: true,
            nickname: true,
            profilePhoto: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20, // Limitar a 20 vídeos mais recentes
    })
  }
}
