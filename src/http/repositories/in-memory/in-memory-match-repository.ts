import type {
  AthleteProfile,
  Match,
  Prisma,
  User,
} from '../../../../generated/prisma/client.js'
import type {
  AdminGlobalMatchFilters,
  AdminGlobalMatchListItem,
  AdminMatchDetail,
  AdminMatchFilters,
  AdminMatchListItem,
  AdminMatchSearchResult,
  AdminPagination,
  MatchRepository,
} from '../match-repository.js'

type AthleteMeta = Pick<
  AthleteProfile,
  'id' | 'nickname' | 'profilePhoto' | 'primaryPosition' | 'birthDate'
> & { user: Pick<User, 'name' | 'email'> }

export class InMemoryMatchRepository implements MatchRepository {
  public items: Match[] = []
  public competitionsById: Record<string, { id: string; name: string }> = {}
  public playsCountByMatchId: Record<string, number> = {}
  public athletesById: Record<string, AthleteMeta> = {}
  public teamsById: Record<
    string,
    { id: string; name: string; acronym: string | null }
  > = {}

  async create(data: Prisma.MatchCreateInput): Promise<Match> {
    const d = data as Prisma.MatchCreateInput & {
      athlete?: { connect?: { id?: string } }
      myTeam?: { connect?: { id?: string } }
      competition?: { connect?: { id?: string } }
    }

    const athleteId = d.athlete?.connect?.id
    const myTeamId = d.myTeam?.connect?.id
    if (!athleteId || !myTeamId) {
      throw new Error('athlete.connect.id and myTeam.connect.id required')
    }

    const now = new Date()
    const match: Match = {
      id: `match-${this.items.length + 1}`,
      athleteId,
      myTeamId,
      adversaryTeam: data.adversaryTeam as string,
      date: data.date as Date,
      modality: data.modality as Match['modality'],
      category: data.category as Match['category'],
      location: data.location as string,
      streamUrl: (data.streamUrl as string | null) ?? null,
      competitionId: d.competition?.connect?.id ?? null,
      status: (data.status as Match['status']) ?? 'SCHEDULED',
      result: (data.result as Match['result']) ?? 'NOT_FINISHED',
      myTeamScore: (data.myTeamScore as number | null) ?? null,
      adversaryScore: (data.adversaryScore as number | null) ?? null,
      playerPosition: (data.playerPosition as Match['playerPosition']) ?? null,
      observations: (data.observations as string | null) ?? null,
      matchDuration: (data.matchDuration as number | null) ?? null,
      approximateTime: (data.approximateTime as number | null) ?? null,
      photoUrl: (data.photoUrl as string | null) ?? null,
      videoUrl: (data.videoUrl as string | null) ?? null,
      youtubeUrl: (data.youtubeUrl as string | null) ?? null,
      performanceRating: (data.performanceRating as number | null) ?? null,
      createdAt: now,
      updatedAt: now,
    }
    this.items.push(match)
    return match
  }

  async findById(id: string): Promise<Match | null> {
    return this.items.find((m) => m.id === id) ?? null
  }

  async findByAthlete(athleteId: string): Promise<Match[]> {
    return this.items.filter((m) => m.athleteId === athleteId)
  }

  async findByAthleteIdAndStatus(
    athleteId: string,
    status: string,
  ): Promise<Match[]> {
    return this.items.filter(
      (m) => m.athleteId === athleteId && m.status === status,
    )
  }

  async update(id: string, data: Prisma.MatchUpdateInput): Promise<Match> {
    const match = this.items.find((m) => m.id === id)
    if (!match) throw new Error('Match not found')

    const applyScalar = <K extends keyof Match>(
      key: K,
      value: unknown,
    ): void => {
      if (value === undefined) return
      if (value === null) {
        ;(match as Match)[key] = null as Match[K]
        return
      }
      if (typeof value === 'object' && 'set' in (value as object)) {
        ;(match as Match)[key] = (value as { set: Match[K] }).set
        return
      }
      ;(match as Match)[key] = value as Match[K]
    }

    applyScalar('myTeamScore', data.myTeamScore)
    applyScalar('adversaryScore', data.adversaryScore)
    applyScalar('result', data.result)
    applyScalar('status', data.status)
    applyScalar('date', data.date)
    applyScalar('adversaryTeam', data.adversaryTeam)
    applyScalar('modality', data.modality)
    applyScalar('category', data.category)
    applyScalar('location', data.location)
    applyScalar('streamUrl', data.streamUrl)
    applyScalar('playerPosition', data.playerPosition)
    applyScalar('observations', data.observations)
    applyScalar('matchDuration', data.matchDuration)
    applyScalar('approximateTime', data.approximateTime)
    applyScalar('photoUrl', data.photoUrl)
    applyScalar('videoUrl', data.videoUrl)
    applyScalar('youtubeUrl', data.youtubeUrl)
    applyScalar('performanceRating', data.performanceRating)

    // Handle athlete: { connect: { id } } nested shape
    const athleteData = (data as { athlete?: { connect?: { id?: string } } })
      .athlete
    if (athleteData?.connect?.id) {
      match.athleteId = athleteData.connect.id
    }

    const myTeamData = (data as { myTeam?: { connect?: { id?: string } } })
      .myTeam
    if (myTeamData?.connect?.id) {
      match.myTeamId = myTeamData.connect.id
    }

    const competitionData = data as {
      competition?: { connect?: { id?: string } } | { disconnect?: boolean }
    }
    if (
      competitionData.competition &&
      'connect' in competitionData.competition &&
      competitionData.competition.connect?.id
    ) {
      match.competitionId = competitionData.competition.connect.id
    }
    if (
      competitionData.competition &&
      'disconnect' in competitionData.competition &&
      competitionData.competition.disconnect
    ) {
      match.competitionId = null
    }

    match.updatedAt = new Date()
    return match
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((m) => m.id !== id)
  }

  async findByAthleteWithPlays(athleteId: string): Promise<Match[]> {
    return this.items.filter((m) => m.athleteId === athleteId)
  }

  async findByIdWithPlays(id: string): Promise<Match | null> {
    return this.items.find((m) => m.id === id) ?? null
  }

  async findManyByAthleteForAdmin(
    athleteProfileId: string,
    filters: AdminMatchFilters,
    pagination: AdminPagination,
  ): Promise<{ items: AdminMatchListItem[]; total: number }> {
    let filtered = this.items.filter((m) => m.athleteId === athleteProfileId)

    if (filters.competitionId) {
      filtered = filtered.filter(
        (m) => m.competitionId === filters.competitionId,
      )
    }
    if (filters.status) {
      filtered = filtered.filter((m) => m.status === filters.status)
    }
    if (filters.result) {
      filtered = filtered.filter((m) => m.result === filters.result)
    }
    if (filters.from) {
      const fromDate = filters.from
      filtered = filtered.filter((m) => m.date >= fromDate)
    }
    if (filters.to) {
      const toDate = filters.to
      filtered = filtered.filter((m) => m.date <= toDate)
    }

    filtered.sort((a, b) => {
      const dateDiff = b.date.getTime() - a.date.getTime()
      if (dateDiff !== 0) return dateDiff
      return b.createdAt.getTime() - a.createdAt.getTime()
    })

    const total = filtered.length
    const start = (pagination.page - 1) * pagination.pageSize
    const paged = filtered.slice(start, start + pagination.pageSize)

    const items: AdminMatchListItem[] = paged.map((m) => ({
      ...m,
      playsCount: this.playsCountByMatchId[m.id] ?? 0,
      competition: m.competitionId
        ? (this.competitionsById[m.competitionId] ?? null)
        : null,
    }))

    return { items, total }
  }

  async findManyGlobalForAdmin(
    filters: AdminGlobalMatchFilters,
    pagination: AdminPagination,
  ): Promise<{ items: AdminGlobalMatchListItem[]; total: number }> {
    let filtered = this.items.slice()

    if (filters.athleteId) {
      filtered = filtered.filter((m) => m.athleteId === filters.athleteId)
    }
    if (filters.competitionId) {
      filtered = filtered.filter(
        (m) => m.competitionId === filters.competitionId,
      )
    }
    if (filters.status) {
      filtered = filtered.filter((m) => m.status === filters.status)
    }
    if (filters.result) {
      filtered = filtered.filter((m) => m.result === filters.result)
    }
    if (filters.from) {
      const from = filters.from
      filtered = filtered.filter((m) => m.date >= from)
    }
    if (filters.to) {
      const to = filters.to
      filtered = filtered.filter((m) => m.date <= to)
    }

    if (filters.primaryPosition) {
      filtered = filtered.filter((m) => {
        const athlete = this.athletesById[m.athleteId]
        return athlete?.primaryPosition === filters.primaryPosition
      })
    }

    if (filters.minAge !== undefined || filters.maxAge !== undefined) {
      const now = new Date()
      filtered = filtered.filter((m) => {
        const athlete = this.athletesById[m.athleteId]
        if (!athlete) return false
        const years =
          (now.getTime() - athlete.birthDate.getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
        if (filters.minAge !== undefined && years < filters.minAge) return false
        if (filters.maxAge !== undefined && years > filters.maxAge + 1) {
          return false
        }
        return true
      })
    }

    if (filters.q && filters.q.trim()) {
      const term = filters.q.trim().toLowerCase()
      filtered = filtered.filter((m) => {
        const athlete = this.athletesById[m.athleteId]
        if (!athlete) return false
        return (
          athlete.nickname?.toLowerCase().includes(term) ||
          athlete.user.name.toLowerCase().includes(term) ||
          athlete.user.email.toLowerCase().includes(term)
        )
      })
    }

    filtered.sort((a, b) => {
      const d = b.date.getTime() - a.date.getTime()
      if (d !== 0) return d
      return b.createdAt.getTime() - a.createdAt.getTime()
    })

    const total = filtered.length
    const start = (pagination.page - 1) * pagination.pageSize
    const paged = filtered.slice(start, start + pagination.pageSize)

    const items: AdminGlobalMatchListItem[] = paged.map((m) => {
      const athlete = this.athletesById[m.athleteId]
      return {
        ...m,
        playsCount: this.playsCountByMatchId[m.id] ?? 0,
        competition: m.competitionId
          ? (this.competitionsById[m.competitionId] ?? null)
          : null,
        athleteProfile: {
          id: athlete?.id ?? m.athleteId,
          name: athlete?.user.name ?? 'Unknown',
          nickname: athlete?.nickname ?? null,
          profilePhoto: athlete?.profilePhoto ?? null,
          primaryPosition: athlete?.primaryPosition ?? 'MIDFIELDER',
        },
      }
    })

    return { items, total }
  }

  async searchByTerm(
    term: string,
    limit: number,
  ): Promise<AdminMatchSearchResult[]> {
    const trimmed = term.trim().toLowerCase()
    if (trimmed.length < 2) return []

    const matches = this.items.filter((m) => {
      if (m.adversaryTeam.toLowerCase().includes(trimmed)) return true
      const athlete = this.athletesById[m.athleteId]
      if (!athlete) return false
      return (
        athlete.nickname?.toLowerCase().includes(trimmed) ||
        athlete.user.name.toLowerCase().includes(trimmed)
      )
    })

    matches.sort((a, b) => {
      const d = b.date.getTime() - a.date.getTime()
      if (d !== 0) return d
      return b.createdAt.getTime() - a.createdAt.getTime()
    })

    return matches.slice(0, limit).map((m) => {
      const athlete = this.athletesById[m.athleteId]
      return {
        id: m.id,
        date: m.date,
        adversaryTeam: m.adversaryTeam,
        myTeamScore: m.myTeamScore,
        adversaryScore: m.adversaryScore,
        athlete: {
          id: athlete?.id ?? m.athleteId,
          name: athlete?.user.name ?? 'Unknown',
          profilePhoto: athlete?.profilePhoto ?? null,
        },
      }
    })
  }

  async findByIdForAdmin(id: string): Promise<AdminMatchDetail | null> {
    const match = this.items.find((m) => m.id === id)
    if (!match) return null

    const athlete = this.athletesById[match.athleteId]
    return {
      ...match,
      playsCount: this.playsCountByMatchId[match.id] ?? 0,
      competition: match.competitionId
        ? (this.competitionsById[match.competitionId] ?? null)
        : null,
      myTeam: this.teamsById[match.myTeamId] ?? null,
      athleteProfile: {
        id: athlete?.id ?? match.athleteId,
        name: athlete?.user.name ?? 'Unknown',
        nickname: athlete?.nickname ?? null,
        profilePhoto: athlete?.profilePhoto ?? null,
        primaryPosition: athlete?.primaryPosition ?? 'MIDFIELDER',
      },
    }
  }
}
