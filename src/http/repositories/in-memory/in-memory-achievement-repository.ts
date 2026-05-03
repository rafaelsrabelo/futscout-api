import { randomUUID } from 'node:crypto'

import type {
  Achievement,
  AchievementType,
  Prisma,
} from '../../../../generated/prisma/client.js'
import type {
  AchievementRepository,
  AdminAthleteAchievementFilters,
  AdminAthleteAchievementPagination,
} from '../achievement-repository.js'

export class InMemoryAchievementRepository implements AchievementRepository {
  public items: Achievement[] = []

  async create(data: Prisma.AchievementCreateInput): Promise<Achievement> {
    const athleteId =
      (data as { athlete?: { connect?: { id?: string } } }).athlete?.connect
        ?.id ?? null

    if (!athleteId) {
      throw new Error('athlete.connect.id required')
    }

    const now = new Date()
    const achievement: Achievement = {
      id: randomUUID(),
      athleteId,
      name: data.name as string,
      category: data.category as string,
      year: data.year as number,
      type: data.type as AchievementType,
      createdAt: now,
      updatedAt: now,
    }
    this.items.push(achievement)
    return achievement
  }

  async findById(id: string): Promise<Achievement | null> {
    return this.items.find((a) => a.id === id) ?? null
  }

  async findByAthleteId(athleteId: string): Promise<Achievement[]> {
    return this.items.filter((a) => a.athleteId === athleteId)
  }

  async findManyByAthleteForAdmin(
    athleteProfileId: string,
    filters: AdminAthleteAchievementFilters,
    pagination: AdminAthleteAchievementPagination,
  ): Promise<{ items: Achievement[]; total: number }> {
    let filtered = this.items.filter((a) => a.athleteId === athleteProfileId)
    if (filters.type) {
      filtered = filtered.filter((a) => a.type === filters.type)
    }
    if (filters.year) {
      filtered = filtered.filter((a) => a.year === filters.year)
    }

    filtered.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year
      return b.createdAt.getTime() - a.createdAt.getTime()
    })

    const total = filtered.length
    const start = (pagination.page - 1) * pagination.pageSize
    return {
      items: filtered.slice(start, start + pagination.pageSize),
      total,
    }
  }

  async update(
    id: string,
    data: Prisma.AchievementUpdateInput,
  ): Promise<Achievement> {
    const idx = this.items.findIndex((a) => a.id === id)
    if (idx === -1) throw new Error('Achievement not found')

    const current = this.items[idx]!
    const next: Achievement = { ...current, updatedAt: new Date() }
    if (data.name !== undefined) next.name = data.name as string
    if (data.category !== undefined) next.category = data.category as string
    if (data.year !== undefined) next.year = data.year as number
    if (data.type !== undefined) next.type = data.type as AchievementType
    this.items[idx] = next
    return next
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((a) => a.id !== id)
  }
}
