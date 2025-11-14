import type {
  AthleteProfileRepository,
  UpdateAthleteProfileData,
} from '../repositories/athlete-profile-repository.js'
import type { AddressRepository } from '../repositories/address-repository.js'
import type { AthleteProfile } from 'generated/prisma/client.js'

interface EditAthleteProfileUseCaseRequest {
  userId: string
  nickname?: string | undefined
  profilePhoto?: string | undefined
  birthDate?: string | undefined // Data de nascimento editável
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
  hasNutritionist?: boolean | undefined
  hasPsychologist?: boolean | undefined
  hasPersonalTrainer?: boolean | undefined
  address?: {
    zipCode?: string | undefined
    street?: string | undefined
    number?: string | undefined
    complement?: string | undefined
    district?: string | undefined
    city?: string | undefined
    state?: string | undefined
    country?: string | undefined
  }
}

interface EditAthleteProfileUseCaseResponse {
  athleteProfile: AthleteProfile
}

export class EditAthleteProfileUseCase {
  constructor(
    private athleteProfileRepository: AthleteProfileRepository,
    private addressRepository: AddressRepository,
  ) {}

  async execute({
    userId,
    address,
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

    // Atualizar o perfil (excluindo address)
    const filteredData = Object.fromEntries(
      Object.entries(profileData).filter(([, value]) => value !== undefined),
    ) as UpdateAthleteProfileData

    const athleteProfile = await this.athleteProfileRepository.update(
      userId,
      filteredData,
    )

    // Atualizar endereço se fornecido
    if (address) {
      const existingAddress = await this.addressRepository.findByAthleteId(
        existingProfile.id,
      )

      if (existingAddress) {
        // Atualizar endereço existente
        const updateData: {
          zipCode?: string
          street?: string
          number?: string
          complement?: string
          district?: string
          city?: string
          state?: string
          country?: string
        } = {}

        if (address.zipCode !== undefined) updateData.zipCode = address.zipCode
        if (address.street !== undefined) updateData.street = address.street
        if (address.number !== undefined) updateData.number = address.number
        if (address.complement !== undefined)
          updateData.complement = address.complement
        if (address.district !== undefined)
          updateData.district = address.district
        if (address.city !== undefined) updateData.city = address.city
        if (address.state !== undefined) updateData.state = address.state
        if (address.country !== undefined) updateData.country = address.country

        await this.addressRepository.update(existingProfile.id, updateData)
      } else {
        // Criar novo endereço
        const addressData: {
          athleteId: string
          zipCode: string
          street: string
          number: string
          complement?: string
          district: string
          city: string
          state: string
          country: string
        } = {
          athleteId: existingProfile.id,
          zipCode: address.zipCode || '',
          street: address.street || '',
          number: address.number || '',
          district: address.district || '',
          city: address.city || '',
          state: address.state || '',
          country: address.country || 'Brasil',
        }

        if (address.complement !== undefined) {
          addressData.complement = address.complement
        }

        await this.addressRepository.create(addressData)
      }
    }

    return {
      athleteProfile,
    }
  }
}
