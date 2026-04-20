import { prisma } from '@/lib/prisma.js'
import type {
  AdminAthleteFilters,
  AdminPagination,
  AthleteProfileRepository,
  CreateAthleteProfileData,
  AthleteFilters,
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
            role: true,
          },
        },
        address: true,
      },
    })

    return athleteProfile
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

  async findByCpf(cpf: string) {
    const athleteProfile = await prisma.athleteProfile.findUnique({
      where: { cpf },
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

    const athletes = await prisma.athleteProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            isActive: true,
          },
        },
        address: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    })

    return athletes
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

  async update(userId: string, data: UpdateAthleteProfileData) {
    const athleteProfile = await prisma.athleteProfile.update({
      where: { userId },
      data,
    })

    return athleteProfile
  }
}
