import type { AthleteProfileRepository } from '../repositories/athlete-profile-repository.js'

interface ListAthletesUseCaseRequest {
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  dominantFoot?: 'RIGHT' | 'LEFT'
  primaryPosition?: 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD'
  secondaryPosition?: 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD'
  classification?: 'DESENVOLVIMENTO' | 'PERFORMANCE'
  currentClub?: string
  nickname?: string
  name?: string
  hasManager?: boolean
  minHeight?: number
  maxHeight?: number
  minWeight?: number
  maxWeight?: number
  minAge?: number
  maxAge?: number
  page?: number
  limit?: number
}

interface ListAthletesUseCaseResponse {
  athletes: Array<{
    id: string
    userId: string
    gender: string
    nickname?: string | null
    profilePhoto?: string | null
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
  }>
  total: number
}

export class ListAthletesUseCase {
  constructor(private athleteProfileRepository: AthleteProfileRepository) {}

  async execute(
    filters: ListAthletesUseCaseRequest,
  ): Promise<ListAthletesUseCaseResponse> {
    const [athletes, total] = await Promise.all([
      this.athleteProfileRepository.findMany(filters),
      this.athleteProfileRepository.countMany(filters),
    ])

    return {
      total,
      athletes: athletes.map((athlete) => ({
        id: athlete.id,
        userId: athlete.userId,
        gender: athlete.gender,
        nickname: athlete.nickname,
        profilePhoto: athlete.profilePhoto,
        height: athlete.height,
        weight: athlete.weight,
        dominantFoot: athlete.dominantFoot,
        primaryPosition: athlete.primaryPosition,
        currentClub: athlete.currentClub,
        hasManager: athlete.hasManager,
        user: {
          id: athlete.user.id,
          name: athlete.user.name,
          role: athlete.user.role,
          isActive: athlete.user.isActive,
        },
        createdAt: athlete.createdAt,
      })),
    }
  }
}
