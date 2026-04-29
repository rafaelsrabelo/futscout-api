import type { Address, AthleteProfile, User } from 'generated/prisma/client.js'
import type {
  AdminAthleteFilters,
  AdminAthleteSearchResult,
  AdminPagination,
  AthleteAdminDetail,
  AthleteAdminSubscriptionView,
  AthleteProfileAdminListItem,
  AthleteProfileRepository,
  CreateAthleteProfileData,
  AthleteFilters,
  AthleteProfileWithUser,
  PlaysByTypeEntry,
  UpdateAthleteProfileData,
} from '../athlete-profile-repository.js'

interface InMemoryPlay {
  id: string
  athleteId: string | null
  matchId: string | null
  playType: string
}

interface InMemoryMatch {
  id: string
  athleteId: string
}

interface InMemorySubscription {
  userId: string
  view: AthleteAdminSubscriptionView
}

export class InMemoryAthleteProfileRepository
  implements AthleteProfileRepository
{
  public items: AthleteProfile[] = []
  public users: User[] = []
  public addresses: Address[] = []
  public plays: InMemoryPlay[] = []
  public matches: InMemoryMatch[] = []
  public achievementsByAthlete: Record<string, number> = {}
  public teamHistoryByAthlete: Record<string, number> = {}
  public subscriptions: InMemorySubscription[] = []

  async create(data: CreateAthleteProfileData): Promise<AthleteProfile> {
    const athleteProfile: AthleteProfile = {
      id: `athlete-${this.items.length + 1}`,
      userId: data.userId,
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

  private applyAdminFilters(
    items: AthleteProfile[],
    filters: AdminAthleteFilters,
  ): AthleteProfile[] {
    let filtered = items

    if (filters.gender) {
      filtered = filtered.filter((item) => item.gender === filters.gender)
    }
    if (filters.dominantFoot) {
      filtered = filtered.filter(
        (item) => item.dominantFoot === filters.dominantFoot,
      )
    }
    if (filters.primaryPosition) {
      filtered = filtered.filter(
        (item) => item.primaryPosition === filters.primaryPosition,
      )
    }
    if (filters.hasManager !== undefined) {
      filtered = filtered.filter(
        (item) => item.hasManager === filters.hasManager,
      )
    }
    if (filters.currentClub) {
      const needle = filters.currentClub.toLowerCase()
      filtered = filtered.filter((item) =>
        item.currentClub?.toLowerCase().includes(needle),
      )
    }
    if (filters.minHeight !== undefined) {
      filtered = filtered.filter((item) => item.height >= filters.minHeight!)
    }
    if (filters.maxHeight !== undefined) {
      filtered = filtered.filter((item) => item.height <= filters.maxHeight!)
    }
    if (filters.minWeight !== undefined) {
      filtered = filtered.filter((item) => item.weight >= filters.minWeight!)
    }
    if (filters.maxWeight !== undefined) {
      filtered = filtered.filter((item) => item.weight <= filters.maxWeight!)
    }

    if (filters.minAge !== undefined || filters.maxAge !== undefined) {
      const today = new Date()
      if (filters.minAge !== undefined) {
        const maxBirthDate = new Date(today)
        maxBirthDate.setFullYear(today.getFullYear() - filters.minAge)
        filtered = filtered.filter((item) => item.birthDate <= maxBirthDate)
      }
      if (filters.maxAge !== undefined) {
        const minBirthDateExclusive = new Date(today)
        minBirthDateExclusive.setFullYear(
          today.getFullYear() - (filters.maxAge + 1),
        )
        filtered = filtered.filter(
          (item) => item.birthDate > minBirthDateExclusive,
        )
      }
    }

    if (filters.q) {
      const needle = filters.q.toLowerCase()
      filtered = filtered.filter((item) => {
        const user = this.users.find((u) => u.id === item.userId)
        return (
          item.nickname?.toLowerCase().includes(needle) ||
          user?.name.toLowerCase().includes(needle) ||
          user?.email.toLowerCase().includes(needle)
        )
      })
    }

    return filtered
  }

  async findByIdForAdmin(id: string): Promise<AthleteAdminDetail | null> {
    const profile = this.items.find((item) => item.id === id)
    if (!profile) return null

    const user = this.users.find((u) => u.id === profile.userId)
    if (!user) return null

    const address = this.addresses.find((a) => a.athleteId === id) ?? null

    const subscription =
      this.subscriptions.find((s) => s.userId === user.id)?.view ?? null

    const matchesCount = this.matches.filter((m) => m.athleteId === id).length
    const matchIds = new Set(
      this.matches.filter((m) => m.athleteId === id).map((m) => m.id),
    )
    const playsCount = this.plays.filter(
      (p) => p.athleteId === id || (p.matchId && matchIds.has(p.matchId)),
    ).length

    return {
      profile,
      address,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
      subscription,
      counts: {
        matches: matchesCount,
        plays: playsCount,
        achievements: this.achievementsByAthlete[id] ?? 0,
        teamHistory: this.teamHistoryByAthlete[id] ?? 0,
      },
    }
  }

  async countPlaysByTypeForAthlete(
    athleteProfileId: string,
  ): Promise<PlaysByTypeEntry[]> {
    const matchIds = new Set(
      this.matches
        .filter((m) => m.athleteId === athleteProfileId)
        .map((m) => m.id),
    )

    const relevant = this.plays.filter(
      (p) =>
        p.athleteId === athleteProfileId ||
        (p.matchId && matchIds.has(p.matchId)),
    )

    const countsByType = new Map<string, number>()
    for (const play of relevant) {
      countsByType.set(play.playType, (countsByType.get(play.playType) ?? 0) + 1)
    }

    return Array.from(countsByType, ([type, count]) => ({ type, count }))
  }

  async findManyForAdmin(
    filters: AdminAthleteFilters,
    pagination: AdminPagination,
  ): Promise<{ items: AthleteProfileAdminListItem[]; total: number }> {
    const filtered = this.applyAdminFilters(this.items, filters)

    const sorted = [...filtered].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )

    const { page, pageSize } = pagination
    const start = (page - 1) * pageSize
    const paged = sorted.slice(start, start + pageSize)

    const items: AthleteProfileAdminListItem[] = paged.map((profile) => {
      const user = this.users.find((u) => u.id === profile.userId)
      return {
        ...profile,
        user: {
          id: user?.id ?? '',
          name: user?.name ?? '',
          email: user?.email ?? '',
          emailVerified: user?.emailVerified ?? false,
          isActive: user?.isActive ?? true,
          createdAt: user?.createdAt ?? new Date(0),
        },
      }
    })

    return { items, total: filtered.length }
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

  async searchByTerm(
    term: string,
    limit: number,
  ): Promise<AdminAthleteSearchResult[]> {
    const trimmed = term.trim().toLowerCase()
    if (trimmed.length < 2) return []

    const results: AdminAthleteSearchResult[] = []

    for (const profile of this.items) {
      const user = this.users.find((u) => u.id === profile.userId)
      if (!user) continue

      const matches =
        profile.nickname?.toLowerCase().includes(trimmed) ||
        user.name.toLowerCase().includes(trimmed) ||
        user.email.toLowerCase().includes(trimmed)

      if (matches) {
        results.push({
          id: profile.id,
          name: user.name,
          nickname: profile.nickname,
          profilePhoto: profile.profilePhoto,
          primaryPosition: profile.primaryPosition,
          currentClub: profile.currentClub,
        })
      }
    }

    results.sort((a, b) => {
      const pa = this.items.find((i) => i.id === a.id)
      const pb = this.items.find((i) => i.id === b.id)
      return (
        (pb?.updatedAt.getTime() ?? 0) - (pa?.updatedAt.getTime() ?? 0)
      )
    })

    return results.slice(0, limit)
  }

  // Helper method for tests
  addUser(user: User) {
    this.users.push(user)
  }
}
