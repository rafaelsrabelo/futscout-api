import type { Match, Prisma } from '../../../../generated/prisma/client.js'
import { prisma } from '../../../lib/prisma.js'
import type {
  AdminGlobalMatchFilters,
  AdminGlobalMatchListItem,
  AdminMatchDetail,
  AdminMatchFilters,
  AdminMatchListItem,
  AdminPagination,
  MatchRepository,
} from '../match-repository.js'

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
        competition: {
          select: {
            id: true,
            name: true,
            description: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    })
  }

  async findByAthlete(athleteId: string): Promise<Match[]> {
    return prisma.match.findMany({
      where: { athleteId },
      include: {
        myTeam: true,
        competition: {
          select: {
            id: true,
            name: true,
            description: true,
            startDate: true,
            endDate: true,
          },
        },
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
        myTeam: true,
        competition: {
          select: {
            id: true,
            name: true,
            description: true,
            startDate: true,
            endDate: true,
          },
        },
        plays: {
          include: {
            classifications: true,
          },
          orderBy: { createdAt: 'asc' }, // Lances por ordem de criação
        },
      },
      orderBy: { date: 'desc' }, // Partidas mais recentes primeiro
    })
  }

  async findByIdWithPlays(id: string): Promise<Match | null> {
    return prisma.match.findUnique({
      where: { id },
      include: {
        myTeam: true,
        competition: {
          select: {
            id: true,
            name: true,
            description: true,
            startDate: true,
            endDate: true,
          },
        },
        plays: {
          include: {
            classifications: true,
          },
          orderBy: { createdAt: 'asc' }, // Ordenar por data de criação
        },
      },
    })
  }

  async findManyByAthleteForAdmin(
    athleteProfileId: string,
    filters: AdminMatchFilters,
    pagination: AdminPagination,
  ): Promise<{ items: AdminMatchListItem[]; total: number }> {
    const where: Prisma.MatchWhereInput = {
      athleteId: athleteProfileId,
    }

    if (filters.competitionId) {
      where.competitionId = filters.competitionId
    }
    if (filters.status) {
      where.status = filters.status
    }
    if (filters.result) {
      where.result = filters.result
    }
    if (filters.from || filters.to) {
      where.date = {}
      if (filters.from) where.date.gte = filters.from
      if (filters.to) where.date.lte = filters.to
    }

    const [rows, total] = await Promise.all([
      prisma.match.findMany({
        where,
        include: {
          competition: { select: { id: true, name: true } },
          _count: { select: { plays: true } },
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.match.count({ where }),
    ])

    const items = rows.map((row) => {
      const { _count, competition, ...rest } = row
      return {
        ...rest,
        playsCount: _count.plays,
        competition: competition ?? null,
      }
    })

    return { items, total }
  }

  async findManyGlobalForAdmin(
    filters: AdminGlobalMatchFilters,
    pagination: AdminPagination,
  ): Promise<{ items: AdminGlobalMatchListItem[]; total: number }> {
    const where: Prisma.MatchWhereInput = {}
    const athleteWhere: Prisma.AthleteProfileWhereInput = {}
    let hasAthleteFilter = false

    if (filters.athleteId) {
      where.athleteId = filters.athleteId
    }
    if (filters.competitionId) where.competitionId = filters.competitionId
    if (filters.status) where.status = filters.status
    if (filters.result) where.result = filters.result
    if (filters.from || filters.to) {
      where.date = {}
      if (filters.from) where.date.gte = filters.from
      if (filters.to) where.date.lte = filters.to
    }

    if (filters.primaryPosition) {
      athleteWhere.primaryPosition = filters.primaryPosition
      hasAthleteFilter = true
    }

    if (filters.minAge !== undefined || filters.maxAge !== undefined) {
      const now = new Date()
      const birthRange: Prisma.DateTimeFilter = {}
      if (filters.minAge !== undefined) {
        const maxBirth = new Date(now)
        maxBirth.setFullYear(now.getFullYear() - filters.minAge)
        birthRange.lte = maxBirth
      }
      if (filters.maxAge !== undefined) {
        const minBirth = new Date(now)
        minBirth.setFullYear(now.getFullYear() - filters.maxAge - 1)
        birthRange.gte = minBirth
      }
      athleteWhere.birthDate = birthRange
      hasAthleteFilter = true
    }

    if (filters.q && filters.q.trim()) {
      const term = filters.q.trim()
      athleteWhere.OR = [
        { nickname: { contains: term, mode: 'insensitive' } },
        { user: { name: { contains: term, mode: 'insensitive' } } },
        { user: { email: { contains: term, mode: 'insensitive' } } },
      ]
      hasAthleteFilter = true
    }

    if (hasAthleteFilter) {
      where.athlete = athleteWhere
    }

    const [rows, total] = await Promise.all([
      prisma.match.findMany({
        where,
        include: {
          competition: { select: { id: true, name: true } },
          _count: { select: { plays: true } },
          athlete: {
            select: {
              id: true,
              nickname: true,
              profilePhoto: true,
              primaryPosition: true,
              user: { select: { name: true } },
            },
          },
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.match.count({ where }),
    ])

    const items: AdminGlobalMatchListItem[] = rows.map((row) => {
      const { _count, competition, athlete, ...rest } = row
      return {
        ...rest,
        playsCount: _count.plays,
        competition: competition ?? null,
        athleteProfile: {
          id: athlete.id,
          name: athlete.user.name,
          nickname: athlete.nickname,
          profilePhoto: athlete.profilePhoto,
          primaryPosition: athlete.primaryPosition,
        },
      }
    })

    return { items, total }
  }

  async findByIdForAdmin(id: string): Promise<AdminMatchDetail | null> {
    const row = await prisma.match.findUnique({
      where: { id },
      include: {
        competition: { select: { id: true, name: true } },
        _count: { select: { plays: true } },
        myTeam: { select: { id: true, name: true, acronym: true } },
        athlete: {
          select: {
            id: true,
            nickname: true,
            profilePhoto: true,
            primaryPosition: true,
            user: { select: { name: true } },
          },
        },
      },
    })

    if (!row) return null

    const { _count, competition, myTeam, athlete, ...rest } = row
    return {
      ...rest,
      playsCount: _count.plays,
      competition: competition ?? null,
      myTeam: myTeam ?? null,
      athleteProfile: {
        id: athlete.id,
        name: athlete.user.name,
        nickname: athlete.nickname,
        profilePhoto: athlete.profilePhoto,
        primaryPosition: athlete.primaryPosition,
      },
    }
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
        competition: {
          select: {
            id: true,
            name: true,
            description: true,
            startDate: true,
            endDate: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    }) as unknown as Match[]
  }
}
