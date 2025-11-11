import type { SavedSearch } from '../../../generated/prisma/client.js'

export interface AthleteSearchFilters {
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  dominantFoot?: 'RIGHT' | 'LEFT'
  primaryPosition?: 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD'
  currentClub?: string
  nickname?: string
  name?: string
  hasManager?: boolean
  minHeight?: number
  maxHeight?: number
  minWeight?: number
  maxWeight?: number
}

export interface CreateSavedSearchData {
  userId: string
  title: string
  description?: string | null
  filters: AthleteSearchFilters
  isActive?: boolean
}

export interface UpdateSavedSearchData {
  title?: string
  description?: string | null
  filters?: AthleteSearchFilters
  isActive?: boolean
}

export interface SavedSearchRepository {
  create(data: CreateSavedSearchData): Promise<SavedSearch>
  findById(id: string): Promise<SavedSearch | null>
  findByUserId(userId: string): Promise<SavedSearch[]>
  update(id: string, data: UpdateSavedSearchData): Promise<SavedSearch>
  delete(id: string): Promise<void>
}
