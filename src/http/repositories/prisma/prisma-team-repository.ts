import { prisma } from '../../../lib/prisma.js'
import type {
  TeamRepository,
  CreateTeamData,
  UpdateTeamData,
  Team,
} from '../team-repository.js'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

export class PrismaTeamRepository implements TeamRepository {
  async create(data: CreateTeamData): Promise<Team> {
    try {
      const team = await prisma.team.create({
        data,
      })

      return team
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = error.meta?.target as string[]
          if (target?.includes('name')) {
            throw new Error('Team name already exists')
          }
        }
      }
      throw error
    }
  }

  async findById(id: string): Promise<Team | null> {
    const team = await prisma.team.findUnique({
      where: { id },
    })

    return team
  }

  async findByUserId(userId: string): Promise<Team[]> {
    const teams = await prisma.team.findMany({
      where: { userId },
      orderBy: [
        { isPrincipal: 'desc' }, // Time principal primeiro
        { createdAt: 'desc' }, // Depois por data de criação
      ],
    })

    return teams
  }

  async findByName(name: string, userId: string): Promise<Team | null> {
    const team = await prisma.team.findFirst({
      where: {
        name,
        userId,
      },
    })

    return team
  }

  async update(id: string, data: UpdateTeamData): Promise<Team> {
    const team = await prisma.team.update({
      where: { id },
      data,
    })

    return team
  }

  async delete(id: string): Promise<void> {
    await prisma.team.delete({
      where: { id },
    })
  }

  async unsetPrincipalTeams(userId: string): Promise<void> {
    await prisma.team.updateMany({
      where: {
        userId,
        isPrincipal: true,
      },
      data: {
        isPrincipal: false,
      },
    })
  }
}
