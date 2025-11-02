import { prisma } from '@/lib/prisma.js'
import type {
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

  async findMany(filters: AthleteFilters) {
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
      page = 1,
      limit = 20,
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
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    })

    return athletes
  }

  async update(userId: string, data: UpdateAthleteProfileData) {
    const athleteProfile = await prisma.athleteProfile.update({
      where: { userId },
      data,
    })

    return athleteProfile
  }
}
