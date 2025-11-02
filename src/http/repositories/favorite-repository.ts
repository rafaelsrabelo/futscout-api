export interface FavoriteFilters {
  userId: string
  page?: number
  limit?: number
}

export interface FavoriteWithAthlete {
  id: string
  athleteId: string
  createdAt: Date
  athlete: {
    id: string
    userId: string
    gender: string
    nickname?: string | null
    height: number
    weight: number
    dominantFoot: string
    primaryPosition: string
    currentClub?: string | null
    hasManager: boolean
    user: {
      id: string
      name: string
      role: string
      isActive: boolean
    }
    createdAt: Date
  }
}

export interface FavoriteRepository {
  toggleFavorite(userId: string, athleteId: string): Promise<boolean>
  isFavorite(userId: string, athleteId: string): Promise<boolean>
  findFavoritesByUser(filters: FavoriteFilters): Promise<FavoriteWithAthlete[]>
  countFavoritesByAthlete(athleteId: string): Promise<number>
}
