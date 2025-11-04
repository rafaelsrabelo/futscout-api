import { prisma } from '../../../lib/prisma.js'
import type {
  ScoutRepository,
  ScoutCreateInput,
  ScoutUpdateInput,
} from '../scout-repository.js'

export class PrismaScoutRepository implements ScoutRepository {
  async create(data: ScoutCreateInput) {
    return await prisma.scout.create({
      data,
    })
  }

  async findByMatchId(matchId: string) {
    return await prisma.scout.findUnique({
      where: {
        matchId,
      },
    })
  }

  async update(id: string, data: ScoutUpdateInput) {
    return await prisma.scout.update({
      where: {
        id,
      },
      data,
    })
  }
}
