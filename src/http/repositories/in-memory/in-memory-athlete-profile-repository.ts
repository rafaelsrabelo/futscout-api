import type { AthleteProfile, User } from 'generated/prisma/client.js'
import type {
  AthleteProfileRepository,
  CreateAthleteProfileData,
  AthleteFilters,
  AthleteProfileWithUser,
  UpdateAthleteProfileData,
} from '../athlete-profile-repository.js'

export class InMemoryAthleteProfileRepository
  implements AthleteProfileRepository
{
  public items: AthleteProfile[] = []
  public users: User[] = []

  async create(data: CreateAthleteProfileData): Promise<AthleteProfile> {
    const athleteProfile: AthleteProfile = {
      id: `athlete-${this.items.length + 1}`,
      userId: data.userId,
      cpf: data.cpf,
      gender: data.gender,
      nickname: data.nickname ?? null,
      profilePhoto: data.profilePhoto ?? null,
      birthDate:
        typeof data.birthDate === 'string'
          ? new Date(data.birthDate)
          : data.birthDate,
      instagramUrl: data.instagramUrl ?? null,
      twitterUrl: data.twitterUrl ?? null,
      height: data.height,
      weight: data.weight,
      dominantFoot: data.dominantFoot,
      primaryPosition: data.primaryPosition,
      secondaryPosition: data.secondaryPosition ?? null,
      currentClub: data.currentClub ?? null,
      biography: data.biography ?? null,
      hasManager: data.hasManager ?? false,
      managerName: data.managerName ?? null,
      managerCompany: data.managerCompany ?? null,
      managerContact: data.managerContact ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.items.push(athleteProfile)
    return athleteProfile
  }

  async findById(id: string): Promise<AthleteProfileWithUser | null> {
    const athleteProfile = this.items.find((item) => item.id === id)
    if (!athleteProfile) return null

    const user = this.users.find((user) => user.id === athleteProfile.userId)
    if (!user) return null

    return {
      ...athleteProfile,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
      },
    }
  }

  async findByUserId(userId: string): Promise<AthleteProfile | null> {
    const athleteProfile = this.items.find((item) => item.userId === userId)
    return athleteProfile || null
  }

  async findMany(filters: AthleteFilters): Promise<AthleteProfileWithUser[]> {
    let filteredItems = this.items

    // Apply filters
    if (filters.gender) {
      filteredItems = filteredItems.filter(
        (item) => item.gender === filters.gender,
      )
    }

    if (filters.dominantFoot) {
      filteredItems = filteredItems.filter(
        (item) => item.dominantFoot === filters.dominantFoot,
      )
    }

    if (filters.primaryPosition) {
      filteredItems = filteredItems.filter(
        (item) => item.primaryPosition === filters.primaryPosition,
      )
    }

    if (filters.currentClub) {
      filteredItems = filteredItems.filter((item) =>
        item.currentClub?.includes(filters.currentClub!),
      )
    }

    if (filters.hasManager !== undefined) {
      filteredItems = filteredItems.filter(
        (item) => item.hasManager === filters.hasManager,
      )
    }

    if (filters.minHeight) {
      filteredItems = filteredItems.filter(
        (item) => item.height >= filters.minHeight!,
      )
    }

    if (filters.maxHeight) {
      filteredItems = filteredItems.filter(
        (item) => item.height <= filters.maxHeight!,
      )
    }

    if (filters.minWeight) {
      filteredItems = filteredItems.filter(
        (item) => item.weight >= filters.minWeight!,
      )
    }

    if (filters.maxWeight) {
      filteredItems = filteredItems.filter(
        (item) => item.weight <= filters.maxWeight!,
      )
    }

    // Map to include user data
    return filteredItems.map((item) => {
      const user = this.users.find((user) => user.id === item.userId)
      return {
        ...item,
        user: {
          id: user?.id || '',
          name: user?.name || '',
          role: user?.role || 'ATHLETE',
          isActive: user?.isActive || true,
        },
      }
    })
  }

  async countMany(filters: AthleteFilters): Promise<number> {
    const items = await this.findMany(filters)
    return items.length
  }

  async findByNickname(nickname: string): Promise<AthleteProfile | null> {
    const athleteProfile = this.items.find((item) => item.nickname === nickname)
    return athleteProfile || null
  }

  async update(
    userId: string,
    data: UpdateAthleteProfileData,
  ): Promise<AthleteProfile> {
    const athleteProfileIndex = this.items.findIndex(
      (item) => item.userId === userId,
    )

    if (athleteProfileIndex === -1) {
      throw new Error('Athlete profile not found')
    }

    const updatedProfile = {
      ...this.items[athleteProfileIndex],
      ...data,
      updatedAt: new Date(),
    } as AthleteProfile

    this.items[athleteProfileIndex] = updatedProfile
    return updatedProfile
  }

  // Helper method for tests
  addUser(user: User) {
    this.users.push(user)
  }
}
