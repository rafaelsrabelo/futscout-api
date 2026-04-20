import type {
  TeamHistory,
  Prisma,
} from '../../../../generated/prisma/client.js'
import type {
  TeamHistoryRepository,
  TeamHistoryWithTeam,
} from '../team-history-repository.js'
import { prisma } from '../../../lib/prisma.js'

export class PrismaTeamHistoryRepository implements TeamHistoryRepository {
  async create(data: Prisma.TeamHistoryCreateInput): Promise<TeamHistory> {
    return await prisma.teamHistory.create({
      data,
      include: {
        team: true,
        athlete: true,
      },
    })
  }

  async findByAthleteId(athleteId: string): Promise<TeamHistory[]> {
    return await prisma.teamHistory.findMany({
      where: {
        athleteId,
      },
      include: {
        team: true,
      },
      orderBy: [
        { startDate: 'desc' }, // Most recent first
      ],
    })
  }

  async findById(id: string): Promise<TeamHistory | null> {
    return await prisma.teamHistory.findUnique({
      where: { id },
      include: {
        team: true,
        athlete: true,
      },
    })
  }

  async update(
    id: string,
    data: Prisma.TeamHistoryUpdateInput,
  ): Promise<TeamHistory> {
    return await prisma.teamHistory.update({
      where: { id },
      data,
      include: {
        team: true,
        athlete: true,
      },
    })
  }

  async delete(id: string): Promise<void> {
    await prisma.teamHistory.delete({
      where: { id },
    })
  }

  async findCurrentTeams(athleteId: string): Promise<TeamHistory[]> {
    return await prisma.teamHistory.findMany({
      where: {
        athleteId,
        endDate: null, // Times atuais não tem data de fim
      },
      include: {
        team: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    })
  }

  async findManyWithTeamByAthlete(
    athleteProfileId: string,
  ): Promise<TeamHistoryWithTeam[]> {
    const rows = await prisma.teamHistory.findMany({
      where: { athleteId: athleteProfileId },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            acronym: true,
            shieldPhoto: true,
          },
        },
      },
      orderBy: [{ startDate: 'desc' }],
    })
    return rows
  }

  async findFormerTeams(athleteId: string): Promise<TeamHistory[]> {
    return await prisma.teamHistory.findMany({
      where: {
        athleteId,
        endDate: { not: null }, // Times anteriores têm data de fim
      },
      include: {
        team: true,
      },
      orderBy: {
        endDate: 'desc',
      },
    })
  }
}
