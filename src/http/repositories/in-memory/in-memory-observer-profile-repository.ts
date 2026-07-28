import { randomUUID } from 'node:crypto'

import type {
  CreateObserverProfileData,
  ObserverProfile,
  ObserverProfileRepository,
  UpdateObserverProfileData,
} from '../observer-profile-repository.js'

export class InMemoryObserverProfileRepository
  implements ObserverProfileRepository
{
  public items: ObserverProfile[] = []

  async create(data: CreateObserverProfileData): Promise<ObserverProfile> {
    const now = new Date()
    const profile: ObserverProfile = {
      id: randomUUID(),
      userId: data.userId,
      currentClub: data.currentClub ?? null,
      phone: data.phone,
      profilePhoto: data.profilePhoto ?? null,
      notifyOnFavoriteActivity: true,
      createdAt: now,
      updatedAt: now,
    }

    this.items.push(profile)
    return profile
  }

  async findById(id: string): Promise<ObserverProfile | null> {
    return this.items.find((item) => item.id === id) ?? null
  }

  async findByUserId(userId: string): Promise<ObserverProfile | null> {
    return this.items.find((item) => item.userId === userId) ?? null
  }

  async update(
    id: string,
    data: UpdateObserverProfileData,
  ): Promise<ObserverProfile> {
    const profile = this.items.find((item) => item.id === id)

    if (!profile) {
      throw new Error('Observer profile not found')
    }

    if (data.currentClub !== undefined) profile.currentClub = data.currentClub
    if (data.phone !== undefined) profile.phone = data.phone
    if (data.profilePhoto !== undefined) {
      profile.profilePhoto = data.profilePhoto
    }
    if (data.notifyOnFavoriteActivity !== undefined) {
      profile.notifyOnFavoriteActivity = data.notifyOnFavoriteActivity
    }
    profile.updatedAt = new Date()

    return profile
  }

  async filterUserIdsAcceptingFavoriteActivity(
    userIds: string[],
  ): Promise<string[]> {
    return this.items
      .filter(
        (item) =>
          userIds.includes(item.userId) && item.notifyOnFavoriteActivity,
      )
      .map((item) => item.userId)
  }
}
