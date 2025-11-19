import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { normalizeCpf, validateCpf } from '../../utils/validateCpf.js'
import type { AddressRepository } from '../repositories/address-repository.js'
import type {
  AthleteProfileRepository,
  CreateAthleteProfileData,
} from '../repositories/athlete-profile-repository.js'
import type { UsersRepository } from '../repositories/users-repository.js'

interface CreateAthleteProfileUseCaseRequest {
  userId: string
  cpf: string
  name: string
  gender: 'MALE' | 'FEMALE' | 'OTHER'
  nickname?: string | undefined
  profilePhoto?: string | undefined
  birthDate: string // ISO string
  instagramUrl?: string | undefined
  twitterUrl?: string | undefined
  youtubeUrl?: string | undefined
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
  hasNutritionist?: boolean | undefined
  hasPsychologist?: boolean | undefined
  hasPersonalTrainer?: boolean | undefined
  // Campos de endereço (opcionais)
  zipCode?: string | undefined
  street?: string | undefined
  number?: string | undefined
  complement?: string | undefined
  district?: string | undefined
  city?: string | undefined
  state?: string | undefined
  country?: string | undefined
  // Campos de time (opcionais)
  team?:
    | {
        name: string
        nickname?: string | undefined
        acronym: string
        shieldPhoto?: string | undefined
        isPrincipal?: boolean | undefined
      }
    | undefined
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
  team?: {
    id: string
    name: string
    nickname?: string | null
    acronym: string
    shieldPhoto?: string | null
    isPrincipal: boolean
    createdAt: Date
    updatedAt: Date
  } | null
}

export class CreateAthleteProfileUseCase {
  constructor(
    private athleteProfileRepository: AthleteProfileRepository,
    private usersRepository: UsersRepository,
    private addressRepository: AddressRepository,
    private teamRepository?: any,
  ) {}

  async execute(
    data: CreateAthleteProfileUseCaseRequest,
  ): Promise<CreateAthleteProfileUseCaseResponse> {
    // Validar CPF
    if (!validateCpf(data.cpf)) {
      throw new Error('Invalid CPF format')
    }

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

    // Verificar se o CPF já existe
    const existingCpf = await this.athleteProfileRepository.findByCpf(
      normalizeCpf(data.cpf),
    )
    if (existingCpf) {
      throw new Error('CPF already exists')
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
      cpf: normalizeCpf(data.cpf), // Normalize CPF (remove formatting)
      gender: data.gender,
      nickname: data.nickname ?? null,
      profilePhoto: data.profilePhoto ?? null,
      birthDate: data.birthDate,
      instagramUrl: data.instagramUrl ?? null,
      twitterUrl: data.twitterUrl ?? null,
      youtubeUrl: data.youtubeUrl ?? null,
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
      hasNutritionist: data.hasNutritionist ?? false,
      hasPsychologist: data.hasPsychologist ?? false,
      hasPersonalTrainer: data.hasPersonalTrainer ?? false,
    }

    try {
      let team = null
      // Se veio dados de time, criar o time igual ao endpoint dedicado
      if (data.team && this.teamRepository) {
        // Se for principal, desmarcar outros
        if (data.team.isPrincipal) {
          await this.teamRepository.unsetPrincipalTeams(data.userId)
        }
        team = await this.teamRepository.create({
          name: data.team.name,
          nickname: data.team.nickname || null,
          acronym: data.team.acronym,
          shieldPhoto: data.team.shieldPhoto || null,
          isPrincipal: data.team.isPrincipal,
          userId: data.userId,
        })
        // Se principal, atualizar currentClub do perfil
        if (data.team.isPrincipal) {
          athleteData.currentClub = team.name
        }
      }

      const athleteProfile =
        await this.athleteProfileRepository.create(athleteData)

      // Criar endereço se fornecido
      if (
        data.zipCode &&
        data.street &&
        data.number &&
        data.district &&
        data.city &&
        data.state &&
        data.country
      ) {
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
          athleteId: athleteProfile.id,
          zipCode: data.zipCode,
          street: data.street,
          number: data.number,
          district: data.district,
          city: data.city,
          state: data.state,
          country: data.country,
        }

        if (data.complement !== undefined) {
          addressData.complement = data.complement
        }

        await this.addressRepository.create(addressData)
      }

      // Atualizar o usuário para marcar que tem perfil e sincronizar o nome
      await this.usersRepository.updateProfile(data.userId, true)
      await this.usersRepository.update(data.userId, {
        name: data.name, // Sincroniza o nome do perfil com o nome do usuário
      })

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
        team,
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
