import type {
  AthleteProfileRepository,
  UpdateAthleteProfileData,
} from '../repositories/athlete-profile-repository.js'
import type { AthleteProfile } from 'generated/prisma/client.js'

interface EditAthleteProfileUseCaseRequest {
  userId: string
  nickname?: string | undefined
  profilePhoto?: string | undefined
  instagramUrl?: string | undefined
  twitterUrl?: string | undefined
  height?: number | undefined
  weight?: number | undefined
  dominantFoot?: 'RIGHT' | 'LEFT' | undefined
  primaryPosition?:
    | 'GOALKEEPER'
    | 'DEFENDER'
    | 'MIDFIELDER'
    | 'FORWARD'
    | undefined
  secondaryPosition?:
    | 'GOALKEEPER'
    | 'DEFENDER'
    | 'MIDFIELDER'
    | 'FORWARD'
    | null
    | undefined
  currentClub?: string | undefined
  biography?: string | undefined
  hasManager?: boolean | undefined
  managerName?: string | null | undefined
  managerCompany?: string | null | undefined
  managerContact?: string | null | undefined
}

interface EditAthleteProfileUseCaseResponse {
  athleteProfile: AthleteProfile
}

export class EditAthleteProfileUseCase {
  constructor(private athleteProfileRepository: AthleteProfileRepository) {}

  async execute({
    userId,
    ...profileData
  }: EditAthleteProfileUseCaseRequest): Promise<EditAthleteProfileUseCaseResponse> {
    // Verificar se o perfil existe
    const existingProfile =
      await this.athleteProfileRepository.findByUserId(userId)

    if (!existingProfile) {
      throw new Error('Athlete profile not found')
    }

    // Se o nickname foi fornecido e é diferente do atual, verificar se já existe
    if (
      profileData.nickname &&
      profileData.nickname !== existingProfile.nickname
    ) {
      const profileWithSameNickname =
        await this.athleteProfileRepository.findByNickname(profileData.nickname)

      if (
        profileWithSameNickname &&
        profileWithSameNickname.userId !== userId
      ) {
        throw new Error('Nickname already exists')
      }
    }

    // Atualizar o perfil
    const filteredData = Object.fromEntries(
      Object.entries(profileData).filter(([, value]) => value !== undefined),
    ) as UpdateAthleteProfileData

    const athleteProfile = await this.athleteProfileRepository.update(
      userId,
      filteredData,
    )

    return {
      athleteProfile,
    }
  }
}
