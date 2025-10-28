import type { AthleteProfile, User } from 'generated/prisma/client.js'
import type { AthleteProfileCreateInput } from 'generated/prisma/models/AthleteProfile.js'

export type CreateAthleteProfileData = Omit<
  AthleteProfileCreateInput,
  'user'
> & {
  userId: string
}

export interface AthleteFilters {
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  dominantFoot?: 'RIGHT' | 'LEFT'
  primaryPosition?: 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD'
  currentClub?: string
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

export interface AthleteProfileRepository {
  create(data: CreateAthleteProfileData): Promise<AthleteProfile>
  findById(id: string): Promise<AthleteProfileWithUser | null>
  findByUserId(userId: string): Promise<AthleteProfile | null>
  findMany(filters: AthleteFilters): Promise<AthleteProfileWithUser[]>
  findByNickname(nickname: string): Promise<AthleteProfile | null>
}
