import { prisma } from '@/lib/prisma.js'
import type {
  AdminAthleteFilters,
  AdminAthleteSearchResult,
  AdminPagination,
  AthleteAdminDetail,
  AthleteProfileRepository,
  CreateAthleteProfileData,
  AthleteFilters,
  PlaysByTypeEntry,
  UpdateAthleteProfileData,
} from '../athlete-profile-repository.js'

export class PrismaAthleteProfileRepository
  implements AthleteProfileRepository
{
  async create(data: CreateAthleteProfileData) {
    const { userId, ...athleteData } = data

    const athleteProfile = await prisma.athleteProfile.create({
      data: {
        ...athleteData,
        user: {
          connect: { id: userId },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    return athleteProfile
  }

  async findById(id: string) {
    const athleteProfile = await prisma.athleteProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
        address: true,
      },
    })

    return athleteProfile
  }

  async findByUserId(userId: string) {
    const athleteProfile = await prisma.athleteProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            cpf: true,
            role: true,
          },
        },
        address: true,
      },
    })

    return athleteProfile
  }

  async searchByTerm(
    term: string,
    limit: number,
  ): Promise<AdminAthleteSearchResult[]> {
    const trimmed = term.trim()
    if (trimmed.length < 2) return []

    const rows = await prisma.athleteProfile.findMany({
      where: {
        OR: [
          { nickname: { contains: trimmed, mode: 'insensitive' } },
          { user: { name: { contains: trimmed, mode: 'insensitive' } } },
          { user: { email: { contains: trimmed, mode: 'insensitive' } } },
        ],
      },
      include: {
        user: { select: { name: true } },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    })

    return rows.map((r) => ({
      id: r.id,
      name: r.user.name,
      nickname: r.nickname,
      profilePhoto: r.profilePhoto,
      primaryPosition: r.primaryPosition,
      currentClub: r.currentClub,
    }))
  }

  async findByNickname(nickname: string) {
    const athleteProfile = await prisma.athleteProfile.findUnique({
      where: { nickname },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    })

    return athleteProfile
  }

  private buildWhere(filters: AthleteFilters) {
    const {
      gender,
      dominantFoot,
      primaryPosition,
      currentClub,
      nickname,
      name,
      hasManager,
      minHeight,
      maxHeight,
      minWeight,
      maxWeight,
    } = filters

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {}

    if (gender) where.gender = gender
    if (dominantFoot) where.dominantFoot = dominantFoot
    if (primaryPosition) where.primaryPosition = primaryPosition
    if (currentClub) {
      where.currentClub = { contains: currentClub, mode: 'insensitive' }
    }
    if (nickname) {
      where.nickname = { contains: nickname, mode: 'insensitive' }
    }
    if (name) {
      where.user = {
        name: { contains: name, mode: 'insensitive' },
      }
    }
    if (hasManager !== undefined) where.hasManager = hasManager

    if (minHeight || maxHeight) {
      where.height = {}
      if (minHeight) where.height.gte = minHeight
      if (maxHeight) where.height.lte = maxHeight
    }

    if (minWeight || maxWeight) {
      where.weight = {}
      if (minWeight) where.weight.gte = minWeight
      if (maxWeight) where.weight.lte = maxWeight
    }

    return where
  }

  async findMany(filters: AthleteFilters) {
    const { page = 1, limit = 20 } = filters
    const where = this.buildWhere(filters)
    const skip = (page - 1) * limit

    const include = {
      user: {
        select: {
          id: true,
          name: true,
          role: true,
          isActive: true,
        },
      },
      address: true,
    } as const
    const orderBy = { createdAt: 'desc' } as const

    // Atletas com Subscription PREMIUM ativa aparecem primeiro na listagem.
    // Como o sort precisa atravessar a paginação, dividimos em duas buscas:
    // página é (a) totalmente premium, (b) parcialmente premium + completa
    // com não-premium, ou (c) totalmente não-premium.
    const premiumSubs = await prisma.subscription.findMany({
      where: {
        status: 'active',
        currentPeriodEnd: { gte: new Date() },
        plan: { name: 'PREMIUM' },
      },
      select: { userId: true },
    })
    const premiumUserIds = premiumSubs.map((s) => s.userId)

    if (premiumUserIds.length === 0) {
      return prisma.athleteProfile.findMany({
        where,
        include,
        orderBy,
        skip,
        take: limit,
      })
    }

    const premiumWhere = { ...where, userId: { in: premiumUserIds } }
    const totalPremium = await prisma.athleteProfile.count({
      where: premiumWhere,
    })

    if (skip >= totalPremium) {
      return prisma.athleteProfile.findMany({
        where: { ...where, userId: { notIn: premiumUserIds } },
        include,
        orderBy,
        skip: skip - totalPremium,
        take: limit,
      })
    }

    const premiumPage = await prisma.athleteProfile.findMany({
      where: premiumWhere,
      include,
      orderBy,
      skip,
      take: limit,
    })
    if (premiumPage.length === limit) return premiumPage

    const remaining = limit - premiumPage.length
    const nonPremiumPage = await prisma.athleteProfile.findMany({
      where: { ...where, userId: { notIn: premiumUserIds } },
      include,
      orderBy,
      skip: 0,
      take: remaining,
    })
    return [...premiumPage, ...nonPremiumPage]
  }

  async countMany(filters: AthleteFilters) {
    const where = this.buildWhere(filters)
    return prisma.athleteProfile.count({ where })
  }

  private buildAdminWhere(filters: AdminAthleteFilters) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {}

    if (filters.gender) where.gender = filters.gender
    if (filters.dominantFoot) where.dominantFoot = filters.dominantFoot
    if (filters.primaryPosition) where.primaryPosition = filters.primaryPosition
    if (filters.hasManager !== undefined) where.hasManager = filters.hasManager

    if (filters.currentClub) {
      where.currentClub = { contains: filters.currentClub, mode: 'insensitive' }
    }

    if (filters.q) {
      const term = filters.q
      where.OR = [
        { nickname: { contains: term, mode: 'insensitive' } },
        { user: { is: { name: { contains: term, mode: 'insensitive' } } } },
        { user: { is: { email: { contains: term, mode: 'insensitive' } } } },
      ]
    }

    if (filters.minHeight !== undefined || filters.maxHeight !== undefined) {
      where.height = {}
      if (filters.minHeight !== undefined) where.height.gte = filters.minHeight
      if (filters.maxHeight !== undefined) where.height.lte = filters.maxHeight
    }

    if (filters.minWeight !== undefined || filters.maxWeight !== undefined) {
      where.weight = {}
      if (filters.minWeight !== undefined) where.weight.gte = filters.minWeight
      if (filters.maxWeight !== undefined) where.weight.lte = filters.maxWeight
    }

    // Idade X hoje ⇒ birthDate ∈ (today - (X+1) anos, today - X anos].
    // minAge define limite superior do birthDate; maxAge define limite
    // inferior exclusivo do birthDate.
    if (filters.minAge !== undefined || filters.maxAge !== undefined) {
      where.birthDate = {}
      const today = new Date()

      if (filters.minAge !== undefined) {
        const maxBirthDate = new Date(today)
        maxBirthDate.setFullYear(today.getFullYear() - filters.minAge)
        where.birthDate.lte = maxBirthDate
      }

      if (filters.maxAge !== undefined) {
        const minBirthDateExclusive = new Date(today)
        minBirthDateExclusive.setFullYear(
          today.getFullYear() - (filters.maxAge + 1),
        )
        where.birthDate.gt = minBirthDateExclusive
      }
    }

    return where
  }

  async findManyForAdmin(
    filters: AdminAthleteFilters,
    pagination: AdminPagination,
  ) {
    const where = this.buildAdminWhere(filters)
    const { page, pageSize } = pagination

    const [items, total] = await Promise.all([
      prisma.athleteProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              cpf: true,
              emailVerified: true,
              isActive: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.athleteProfile.count({ where }),
    ])

    return { items, total }
  }

  async findByIdForAdmin(id: string): Promise<AthleteAdminDetail | null> {
    const profile = await prisma.athleteProfile.findUnique({
      where: { id },
      include: {
        address: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            cpf: true,
            role: true,
            emailVerified: true,
            isActive: true,
            createdAt: true,
            lastLoginAt: true,
            subscriptions: {
              where: { status: 'active' },
              orderBy: { currentPeriodEnd: 'desc' },
              take: 1,
              include: {
                plan: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    currency: true,
                    isUnlimited: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            matches: true,
            plays: true,
            achievements: true,
            teamHistory: true,
          },
        },
      },
    })

    if (!profile) {
      return null
    }

    const { user, address, _count, ...profileOnly } = profile
    const [activeSubscription] = user.subscriptions

    return {
      profile: { ...profileOnly, cpf: user.cpf },
      address,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      subscription: activeSubscription
        ? {
            status: activeSubscription.status,
            currentPeriodEnd: activeSubscription.currentPeriodEnd,
            plan: activeSubscription.plan,
          }
        : null,
      counts: {
        matches: _count.matches,
        plays: _count.plays,
        achievements: _count.achievements,
        teamHistory: _count.teamHistory,
      },
    }
  }

  async countPlaysByTypeForAthlete(
    athleteProfileId: string,
  ): Promise<PlaysByTypeEntry[]> {
    const rows = await prisma.play.groupBy({
      by: ['playType'],
      where: {
        OR: [
          { athleteId: athleteProfileId },
          { match: { athleteId: athleteProfileId } },
        ],
      },
      _count: { _all: true },
    })

    return rows.map((row) => ({
      type: row.playType,
      count: row._count._all,
    }))
  }

  async update(userId: string, data: UpdateAthleteProfileData) {
    const athleteProfile = await prisma.athleteProfile.update({
      where: { userId },
      data,
    })

    return athleteProfile
  }
}
