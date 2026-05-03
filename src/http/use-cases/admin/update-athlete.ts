import type { Address, AthleteProfile, User } from 'generated/prisma/client.js'

import type { AddressRepository } from '../../repositories/address-repository.js'
import type {
  AthleteProfileRepository,
  UpdateAthleteProfileData,
} from '../../repositories/athlete-profile-repository.js'
import type { UsersRepository } from '../../repositories/users-repository.js'

import { AthleteNotFoundError } from './errors/athlete-not-found-error.js'
import { CpfAlreadyInUseError } from './errors/cpf-already-in-use-error.js'
import { EmailAlreadyInUseError } from './errors/email-already-in-use-error.js'
import { NicknameAlreadyInUseError } from './errors/nickname-already-in-use-error.js'

export interface UpdateAthleteAdminAddressInput {
  zipCode?: string
  street?: string
  number?: string
  complement?: string | null
  district?: string
  city?: string
  state?: string
  country?: string
}

export interface UpdateAthleteAdminUseCaseRequest {
  athleteProfileId: string
  // Campos do usuário (conta)
  name?: string
  email?: string
  cpf?: string | null
  isActive?: boolean
  // Campos do perfil
  nickname?: string
  profilePhoto?: string
  birthDate?: string
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
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
  hasNutritionist?: boolean
  hasPsychologist?: boolean
  hasPersonalTrainer?: boolean
  instagramUrl?: string
  twitterUrl?: string
  youtubeUrl?: string
  // Endereço (upsert: cria se não existe, atualiza se existe)
  address?: UpdateAthleteAdminAddressInput
}

export interface UpdateAthleteAdminUseCaseResponse {
  profile: AthleteProfile
  address: Address | null
  user: Pick<User, 'id' | 'name' | 'email' | 'cpf' | 'role' | 'isActive'>
}

export class UpdateAthleteAdminUseCase {
  constructor(
    private athleteProfileRepository: AthleteProfileRepository,
    private addressRepository: AddressRepository,
    private usersRepository: UsersRepository,
  ) {}

  async execute(
    request: UpdateAthleteAdminUseCaseRequest,
  ): Promise<UpdateAthleteAdminUseCaseResponse> {
    const { athleteProfileId, address, name, email, cpf, isActive, ...rest } =
      request

    const existingProfile =
      await this.athleteProfileRepository.findById(athleteProfileId)

    if (!existingProfile) {
      throw new AthleteNotFoundError()
    }

    const userId = existingProfile.userId

    const existingUser = await this.usersRepository.findById(userId)

    if (!existingUser) {
      throw new AthleteNotFoundError()
    }

    if (rest.nickname && rest.nickname !== existingProfile.nickname) {
      const conflict = await this.athleteProfileRepository.findByNickname(
        rest.nickname,
      )

      if (conflict && conflict.userId !== userId) {
        throw new NicknameAlreadyInUseError()
      }
    }

    if (email && email !== existingUser.email) {
      const conflict = await this.usersRepository.findByEmail(email)

      if (conflict && conflict.id !== userId) {
        throw new EmailAlreadyInUseError()
      }
    }

    if (cpf !== undefined && cpf !== null && cpf !== existingUser.cpf) {
      const conflict = await this.usersRepository.findByCpf(cpf)

      if (conflict && conflict.id !== userId) {
        throw new CpfAlreadyInUseError()
      }
    }

    const userPatch: Partial<User> = {}
    if (name !== undefined) userPatch.name = name
    if (email !== undefined) userPatch.email = email
    if (cpf !== undefined) userPatch.cpf = cpf
    if (isActive !== undefined) userPatch.isActive = isActive

    if (Object.keys(userPatch).length > 0) {
      await this.usersRepository.update(userId, userPatch)
    }

    const profileData = Object.fromEntries(
      Object.entries(rest).filter(([, value]) => value !== undefined),
    ) as UpdateAthleteProfileData

    if (Object.keys(profileData).length > 0) {
      await this.athleteProfileRepository.update(userId, profileData)
    }

    if (address) {
      const existingAddress =
        await this.addressRepository.findByAthleteId(athleteProfileId)

      if (existingAddress) {
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
        if (address.complement !== undefined && address.complement !== null) {
          updateData.complement = address.complement
        }
        if (address.district !== undefined)
          updateData.district = address.district
        if (address.city !== undefined) updateData.city = address.city
        if (address.state !== undefined) updateData.state = address.state
        if (address.country !== undefined) updateData.country = address.country

        if (Object.keys(updateData).length > 0) {
          await this.addressRepository.update(athleteProfileId, updateData)
        }
      } else {
        const createData: {
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
          athleteId: athleteProfileId,
          zipCode: address.zipCode ?? '',
          street: address.street ?? '',
          number: address.number ?? '',
          district: address.district ?? '',
          city: address.city ?? '',
          state: address.state ?? '',
          country: address.country ?? 'Brasil',
        }

        if (address.complement !== undefined && address.complement !== null) {
          createData.complement = address.complement
        }

        await this.addressRepository.create(createData)
      }
    }

    const updatedProfile =
      await this.athleteProfileRepository.findByUserId(userId)
    const updatedAddress =
      await this.addressRepository.findByAthleteId(athleteProfileId)
    const updatedUser = await this.usersRepository.findById(userId)

    if (!updatedProfile || !updatedUser) {
      throw new AthleteNotFoundError()
    }

    return {
      profile: updatedProfile,
      address: updatedAddress,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        cpf: updatedUser.cpf,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
      },
    }
  }
}
