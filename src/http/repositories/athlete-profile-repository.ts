import type { Address, AthleteProfile, User } from 'generated/prisma/client.js'
import type { AthleteProfileCreateInput } from 'generated/prisma/models/AthleteProfile.js'

export type CreateAthleteProfileData = Omit<
  AthleteProfileCreateInput,
  'user'
> & {
  userId: string
}

export type UpdateAthleteProfileData = {
  nickname?: string
  profilePhoto?: string
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  birthDate?: string // Data de nascimento editável
  instagramUrl?: string
  twitterUrl?: string
  youtubeUrl?: string
  height?: number
  weight?: number
  dominantFoot?: 'RIGHT' | 'LEFT'
  primaryPosition?: 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD'
  secondaryPosition?:
    | 'GOALKEEPER'
    | 'DEFENDER'
    | 'MIDFIELDER'
    | 'FORWARD'
    | null
  currentClub?: string | null
  biography?: string
  hasManager?: boolean
  managerName?: string | null
  managerCompany?: string | null
  managerContact?: string | null
  // Acompanhamentos profissionais
  hasNutritionist?: boolean
  hasPsychologist?: boolean
  hasPersonalTrainer?: boolean
}

export interface AthleteFilters {
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
  page?: number
  limit?: number
}

export type AthleteProfileWithUser = AthleteProfile & {
  user: Pick<User, 'id' | 'name' | 'role' | 'isActive'>
}

export interface AdminAthleteFilters {
  q?: string
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  primaryPosition?: 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD'
  dominantFoot?: 'RIGHT' | 'LEFT'
  currentClub?: string
  hasManager?: boolean
  minAge?: number
  maxAge?: number
  minHeight?: number
  maxHeight?: number
  minWeight?: number
  maxWeight?: number
}

export interface AdminPagination {
  page: number
  pageSize: number
}

export interface AthleteProfileAdminListItem {
  profile: AthleteProfile | null
  user: Pick<
    User,
    | 'id'
    | 'name'
    | 'email'
    | 'cpf'
    | 'emailVerified'
    | 'isActive'
    | 'createdAt'
    | 'lastLoginAt'
  >
}

export interface AthleteAdminSubscriptionView {
  status: string
  currentPeriodEnd: Date
  plan: {
    id: string
    name: string
    price: number
    currency: string
    isUnlimited: boolean
  }
}

export interface AthleteAdminCounts {
  matches: number
  plays: number
  achievements: number
  teamHistory: number
}

export interface AthleteAdminDetail {
  profile: AthleteProfile & { cpf: string | null }
  address: Address | null
  user: Pick<
    User,
    | 'id'
    | 'name'
    | 'email'
    | 'role'
    | 'emailVerified'
    | 'isActive'
    | 'createdAt'
    | 'lastLoginAt'
  >
  subscription: AthleteAdminSubscriptionView | null
  counts: AthleteAdminCounts
}

export interface PlaysByTypeEntry {
  type: string
  count: number
}

export interface AdminAthleteSearchResult {
  id: string
  name: string
  nickname: string | null
  profilePhoto: string | null
  primaryPosition: 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD' | null
  currentClub: string | null
}

export interface AthleteProfileRepository {
  create(data: CreateAthleteProfileData): Promise<AthleteProfile>
  findById(id: string): Promise<AthleteProfileWithUser | null>
  findByUserId(userId: string): Promise<AthleteProfile | null>
  findMany(filters: AthleteFilters): Promise<AthleteProfileWithUser[]>
  countMany(filters: AthleteFilters): Promise<number>
  findManyForAdmin(
    filters: AdminAthleteFilters,
    pagination: AdminPagination,
  ): Promise<{ items: AthleteProfileAdminListItem[]; total: number }>
  findByIdForAdmin(id: string): Promise<AthleteAdminDetail | null>
  countPlaysByTypeForAthlete(
    athleteProfileId: string,
  ): Promise<PlaysByTypeEntry[]>
  findByNickname(nickname: string): Promise<AthleteProfile | null>
  searchByTerm(term: string, limit: number): Promise<AdminAthleteSearchResult[]>
  update(
    userId: string,
    data: UpdateAthleteProfileData,
  ): Promise<AthleteProfile>
}
