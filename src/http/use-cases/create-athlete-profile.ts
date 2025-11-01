import type { UsersRepository } from '../repositories/users-repository.js'
import type {
  AthleteProfileRepository,
  CreateAthleteProfileData,
} from '../repositories/athlete-profile-repository.js'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

interface CreateAthleteProfileUseCaseRequest {
  userId: string
  cpf: string
  gender: 'MALE' | 'FEMALE' | 'OTHER'
  nickname?: string | undefined
  profilePhoto?: string | undefined
  birthDate: string // ISO string
  instagramUrl?: string | undefined
  twitterUrl?: string | undefined
  height: number
  weight: number
  dominantFoot: 'RIGHT' | 'LEFT'
  primaryPosition: 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD'
  secondaryPosition?:
    | 'GOALKEEPER'
    | 'DEFENDER'
    | 'MIDFIELDER'
    | 'FORWARD'
    | undefined
  currentClub?: string | undefined
  biography?: string | undefined
  hasManager?: boolean | undefined
  managerName?: string | undefined
  managerCompany?: string | undefined
  managerContact?: string | undefined
}

interface CreateAthleteProfileUseCaseResponse {
  athleteProfile: {
    id: string
    userId: string
    cpf: string
    gender: string
    nickname?: string | null
    height: number
    weight: number
    dominantFoot: string
    primaryPosition: string
    currentClub?: string | null
    createdAt: Date
  }
}

export class CreateAthleteProfileUseCase {
  constructor(
    private athleteProfileRepository: AthleteProfileRepository,
    private usersRepository: UsersRepository,
  ) {}

  async execute(
    data: CreateAthleteProfileUseCaseRequest,
  ): Promise<CreateAthleteProfileUseCaseResponse> {
    // Verificar se o usuário existe
    const user = await this.usersRepository.findById(data.userId)
    if (!user) {
      throw new Error('User not found')
    }

    // Verificar se já tem perfil
    const existingProfile = await this.athleteProfileRepository.findByUserId(
      data.userId,
    )
    if (existingProfile) {
      throw new Error('User already has an athlete profile')
    }

    // Verificar se o nickname já existe (se fornecido)
    if (data.nickname) {
      const existingNickname =
        await this.athleteProfileRepository.findByNickname(data.nickname)
      if (existingNickname) {
        throw new Error('Nickname already exists')
      }
    }

    // Create athlete profile - convert undefined to null for Prisma compatibility
    const athleteData: CreateAthleteProfileData = {
      userId: data.userId,
      cpf: data.cpf,
      gender: data.gender,
      nickname: data.nickname ?? null,
      profilePhoto: data.profilePhoto ?? null,
      birthDate: data.birthDate,
      instagramUrl: data.instagramUrl ?? null,
      twitterUrl: data.twitterUrl ?? null,
      height: data.height,
      weight: data.weight,
      dominantFoot: data.dominantFoot,
      primaryPosition: data.primaryPosition,
      secondaryPosition: data.secondaryPosition ?? null,
      currentClub: data.currentClub ?? null,
      biography: data.biography ?? null,
      hasManager: data.hasManager ?? false,
      managerName: data.managerName ?? null,
      managerCompany: data.managerCompany ?? null,
      managerContact: data.managerContact ?? null,
    }

    try {
      const athleteProfile =
        await this.athleteProfileRepository.create(athleteData)

      // Atualizar o usuário para marcar que tem perfil
      await this.usersRepository.updateProfile(data.userId, true)

      return {
        athleteProfile: {
          id: athleteProfile.id,
          userId: athleteProfile.userId,
          cpf: athleteProfile.cpf,
          gender: athleteProfile.gender,
          nickname: athleteProfile.nickname,
          height: athleteProfile.height,
          weight: athleteProfile.weight,
          dominantFoot: athleteProfile.dominantFoot,
          primaryPosition: athleteProfile.primaryPosition,
          currentClub: athleteProfile.currentClub,
          createdAt: athleteProfile.createdAt,
        },
      }
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = error.meta?.target as string[]
          if (target?.includes('cpf')) {
            throw new Error('CPF already exists')
          }
          if (target?.includes('nickname')) {
            throw new Error('Nickname already exists')
          }
        }
      }
      throw error
    }
  }
}
