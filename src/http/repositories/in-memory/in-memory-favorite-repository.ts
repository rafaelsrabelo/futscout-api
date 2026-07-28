import { randomUUID } from 'node:crypto'

import type {
  FavoriteFilters,
  FavoriteRepository,
  FavoriteWithAthlete,
} from '../favorite-repository.js'

interface InMemoryFavorite {
  id: string
  userId: string
  athleteId: string
  createdAt: Date
}

export class InMemoryFavoriteRepository implements FavoriteRepository {
  public items: InMemoryFavorite[] = []
  /** Preenchido pelos testes que precisam do payload completo do favorito. */
  public athletes: Map<string, FavoriteWithAthlete['athlete']> = new Map()

  async toggleFavorite(userId: string, athleteId: string): Promise<boolean> {
    const index = this.items.findIndex(
      (item) => item.userId === userId && item.athleteId === athleteId,
    )

    if (index >= 0) {
      this.items.splice(index, 1)
      return false
    }

    this.items.push({
      id: randomUUID(),
      userId,
      athleteId,
      createdAt: new Date(),
    })
    return true
  }

  async isFavorite(userId: string, athleteId: string): Promise<boolean> {
    return this.items.some(
      (item) => item.userId === userId && item.athleteId === athleteId,
    )
  }

  async findFavoritesByUser(
    filters: FavoriteFilters,
  ): Promise<FavoriteWithAthlete[]> {
    const { userId, page = 1, limit = 20 } = filters

    return this.items
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice((page - 1) * limit, page * limit)
      .flatMap((item) => {
        const athlete = this.athletes.get(item.athleteId)
        if (!athlete) return []

        return [
          {
            id: item.id,
            athleteId: item.athleteId,
            createdAt: item.createdAt,
            athlete,
          },
        ]
      })
  }

  async countFavoritesByAthlete(athleteId: string): Promise<number> {
    return this.items.filter((item) => item.athleteId === athleteId).length
  }

  async findUserIdsByAthlete(athleteId: string): Promise<string[]> {
    return this.items
      .filter((item) => item.athleteId === athleteId)
      .map((item) => item.userId)
  }
}
