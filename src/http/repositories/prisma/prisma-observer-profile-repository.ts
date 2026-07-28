import { prisma } from '../../../lib/prisma.js'
import type {
  CreateObserverProfileData,
  ObserverProfile,
  ObserverProfileRepository,
  UpdateObserverProfileData,
} from '../observer-profile-repository.js'

export class PrismaObserverProfileRepository
  implements ObserverProfileRepository
{
  async create(data: CreateObserverProfileData): Promise<ObserverProfile> {
    const observerProfile = await prisma.observerProfile.create({
      data,
    })

    return observerProfile
  }

  async findById(id: string): Promise<ObserverProfile | null> {
    const observerProfile = await prisma.observerProfile.findUnique({
      where: {
        id,
      },
    })

    return observerProfile
  }

  async findByUserId(userId: string): Promise<ObserverProfile | null> {
    const observerProfile = await prisma.observerProfile.findUnique({
      where: {
        userId,
      },
    })

    return observerProfile
  }

  async update(
    id: string,
    data: UpdateObserverProfileData,
  ): Promise<ObserverProfile> {
    const observerProfile = await prisma.observerProfile.update({
      where: {
        id,
      },
      data,
    })

    return observerProfile
  }

  async filterUserIdsAcceptingFavoriteActivity(
    userIds: string[],
  ): Promise<string[]> {
    if (userIds.length === 0) return []

    const profiles = await prisma.observerProfile.findMany({
      where: {
        userId: { in: userIds },
        notifyOnFavoriteActivity: true,
      },
      select: { userId: true },
    })

    return profiles.map((profile) => profile.userId)
  }
}
