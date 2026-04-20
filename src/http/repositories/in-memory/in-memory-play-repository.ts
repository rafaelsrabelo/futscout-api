import { randomUUID } from 'node:crypto'

import type {
  Play,
  PlayClassifications,
  Prisma,
} from '../../../../generated/prisma/client.js'
import type {
  AdminAthletePlayFilters,
  AdminAthletePlayListItem,
  AdminAthletePlayPagination,
  CreatePlayWithClassificationsInput,
  PlayRepository,
  PlayWithClassifications,
} from '../play-repository.js'

export class InMemoryPlayRepository implements PlayRepository {
  public items: PlayWithClassifications[] = []
  public matchMeta: Record<
    string,
    { id: string; date: Date; adversaryTeam: string; athleteId: string }
  > = {}

  async create(data: Prisma.PlayCreateInput): Promise<Play> {
    throw new Error('InMemoryPlayRepository.create: not implemented')
  }

  async createWithClassifications(
    input: CreatePlayWithClassificationsInput,
  ): Promise<PlayWithClassifications> {
    const playId = randomUUID()
    const now = new Date()

    const classifications: PlayClassifications[] = (
      input.classifications ?? []
    ).map((classification) => ({
      id: randomUUID(),
      playId,
      classification,
      createdAt: now,
    }))

    const play: PlayWithClassifications = {
      id: playId,
      matchId: input.matchId,
      athleteId: input.athleteId,
      playType: input.playType,
      videoUrl: input.videoUrl ?? null,
      thumbnailUrl: input.thumbnailUrl ?? null,
      photoUrl: input.photoUrl ?? null,
      rating: input.rating ?? null,
      observations: input.observations ?? null,
      createdAt: now,
      updatedAt: now,
      classifications,
    }

    this.items.push(play)
    return play
  }

  async findById(id: string): Promise<Play | null> {
    return this.items.find((p) => p.id === id) ?? null
  }

  async findByMatch(matchId: string): Promise<Play[]> {
    return this.items.filter((p) => p.matchId === matchId)
  }

  async findManyByMatchId(matchId: string): Promise<Play[]> {
    return this.items.filter((p) => p.matchId === matchId)
  }

  async findVideosByAthleteId(athleteId: string): Promise<Play[]> {
    return this.items.filter(
      (p) => p.athleteId === athleteId && p.videoUrl !== null,
    )
  }

  async findManyByAthleteForAdmin(
    athleteProfileId: string,
    filters: AdminAthletePlayFilters,
    pagination: AdminAthletePlayPagination,
  ): Promise<{ items: AdminAthletePlayListItem[]; total: number }> {
    let filtered = this.items.filter((p) => {
      if (p.athleteId === athleteProfileId) return true
      if (p.matchId && this.matchMeta[p.matchId]?.athleteId === athleteProfileId) {
        return true
      }
      return false
    })

    if (filters.hasVideo === true) {
      filtered = filtered.filter((p) => p.videoUrl !== null)
    } else if (filters.hasVideo === false) {
      filtered = filtered.filter((p) => p.videoUrl === null)
    }

    if (filters.playType) {
      filtered = filtered.filter((p) => p.playType === filters.playType)
    }
    if (filters.matchId) {
      filtered = filtered.filter((p) => p.matchId === filters.matchId)
    }
    if (filters.from) {
      const from = filters.from
      filtered = filtered.filter((p) => p.createdAt >= from)
    }
    if (filters.to) {
      const to = filters.to
      filtered = filtered.filter((p) => p.createdAt <= to)
    }

    filtered.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )

    const total = filtered.length
    const start = (pagination.page - 1) * pagination.pageSize
    const paged = filtered.slice(start, start + pagination.pageSize)

    const items: AdminAthletePlayListItem[] = paged.map((p) => {
      const match = p.matchId ? this.matchMeta[p.matchId] : undefined
      return {
        ...p,
        match: match
          ? { id: match.id, date: match.date, adversaryTeam: match.adversaryTeam }
          : null,
      }
    })

    return { items, total }
  }

  async update(id: string, data: Prisma.PlayUpdateInput): Promise<Play> {
    throw new Error('InMemoryPlayRepository.update: not implemented')
  }

  async updateVideoUrl(
    id: string,
    videoUrl: string,
    thumbnailUrl?: string | null,
  ): Promise<Play> {
    const play = this.items.find((p) => p.id === id)
    if (!play) {
      throw new Error('Play not found')
    }
    play.videoUrl = videoUrl
    if (thumbnailUrl !== undefined) {
      play.thumbnailUrl = thumbnailUrl
    }
    play.updatedAt = new Date()
    return play
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((p) => p.id !== id)
  }
}
