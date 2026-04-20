import type {
  Achievement,
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
    throw new Error('InMemoryAchievementRepository.create: not implemented')
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
    throw new Error('InMemoryAchievementRepository.update: not implemented')
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((a) => a.id !== id)
  }
}
