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
    })
  }

  async findByMatch(matchId: string): Promise<Play[]> {
    return prisma.play.findMany({
      where: { matchId },
      orderBy: { approximateTime: 'asc' },
    })
  }

  async findManyByMatchId(matchId: string): Promise<Play[]> {
    return prisma.play.findMany({
      where: { matchId },
      orderBy: { approximateTime: 'asc' },
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
}
