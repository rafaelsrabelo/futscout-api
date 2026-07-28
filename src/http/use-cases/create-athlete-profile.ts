import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import type { AddressRepository } from '../repositories/address-repository.js'
import type {
  AthleteProfileRepository,
  CreateAthleteProfileData,
} from '../repositories/athlete-profile-repository.js'
import type { TeamRepository } from '../repositories/team-repository.js'
import type { UsersRepository } from '../repositories/users-repository.js'

interface CreateAthleteProfileUseCaseRequest {
  userId: string
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
        acronym?: string | undefined
        shieldPhoto?: string | undefined
        isPrincipal?: boolean | undefined
      }
    | undefined
}

interface CreateAthleteProfileUseCaseResponse {
  athleteProfile: {
    id: string
    userId: string
    gender: string | null
    nickname?: string | null
    height: number | null
    weight: number | null
    dominantFoot: string | null
    primaryPosition: string | null
    currentClub?: string | null
    createdAt: Date
  }
  team?: {
    id: string
    name: string
    acronym?: string | null
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
    private teamRepository?: TeamRepository,
  ) {}

  async execute(
    data: CreateAthleteProfileUseCaseRequest,
  ): Promise<CreateAthleteProfileUseCaseResponse> {
    const user = await this.usersRepository.findById(data.userId)
    if (!user) {
      throw new Error('User not found')
    }

    // Verificar se já tem perfil
    const existingProfile = await this.athleteProfileRepository.findByUserId(
      data.userId,
    )
    if (existingProfile) {
      // Atletas importados nascem com perfil esqueleto.
      // Se algum dos 6 campos obrigatórios está null, é esqueleto — completa via
      // update em vez de erro. Se já está completo, é tentativa de duplicar.
      const isSkeleton =
        existingProfile.birthDate === null ||
        existingProfile.gender === null ||
        existingProfile.primaryPosition === null ||
        existingProfile.height === null ||
        existingProfile.weight === null ||
        existingProfile.dominantFoot === null

      if (!isSkeleton) {
        throw new Error('User already has an athlete profile')
      }

      return this.completeSkeletonProfile(data, existingProfile.id)
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
          acronym: data.team.acronym || null,
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

      // Marcar que o usuário tem perfil. O nome não é tocado aqui — ele vem do
      // cadastro e só muda pelo PUT /athletes/profile.
      await this.usersRepository.updateProfile(data.userId, true)

      return {
        athleteProfile: {
          id: athleteProfile.id,
          userId: athleteProfile.userId,
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
          if (target?.includes('nickname')) {
            throw new Error('Nickname already exists')
          }
        }
      }
      throw error
    }
  }

  // Completa um perfil esqueleto (atleta importado pela planilha admin).
  // O perfil já existe — atualiza com os dados que o atleta preencheu no wizard.
  // Não toca em cpf nem cria duplicação de CPF (perfil é o mesmo).
  private async completeSkeletonProfile(
    data: CreateAthleteProfileUseCaseRequest,
    profileId: string,
  ): Promise<CreateAthleteProfileUseCaseResponse> {
    if (data.nickname) {
      const existingNickname =
        await this.athleteProfileRepository.findByNickname(data.nickname)
      if (existingNickname && existingNickname.id !== profileId) {
        throw new Error('Nickname already exists')
      }
    }

    let team = null
    let currentClub: string | null | undefined = data.currentClub
    if (data.team && this.teamRepository) {
      if (data.team.isPrincipal) {
        await this.teamRepository.unsetPrincipalTeams(data.userId)
      }
      team = await this.teamRepository.create({
        name: data.team.name,
        acronym: data.team.acronym || null,
        shieldPhoto: data.team.shieldPhoto || null,
        isPrincipal: data.team.isPrincipal,
        userId: data.userId,
      })
      if (data.team.isPrincipal) {
        currentClub = team.name
      }
    }

    const athleteProfile = await this.athleteProfileRepository.update(
      data.userId,
      {
        gender: data.gender,
        nickname: data.nickname ?? undefined,
        profilePhoto: data.profilePhoto ?? undefined,
        birthDate: data.birthDate,
        instagramUrl: data.instagramUrl ?? undefined,
        twitterUrl: data.twitterUrl ?? undefined,
        youtubeUrl: data.youtubeUrl ?? undefined,
        height: data.height,
        weight: data.weight,
        dominantFoot: data.dominantFoot,
        primaryPosition: data.primaryPosition,
        secondaryPosition: data.secondaryPosition ?? null,
        currentClub: currentClub ?? null,
        biography: data.biography ?? undefined,
        hasManager: data.hasManager ?? false,
        managerName: data.managerName ?? null,
        managerCompany: data.managerCompany ?? null,
        managerContact: data.managerContact ?? null,
        hasNutritionist: data.hasNutritionist ?? false,
        hasPsychologist: data.hasPsychologist ?? false,
        hasPersonalTrainer: data.hasPersonalTrainer ?? false,
      },
    )

    if (
      data.zipCode &&
      data.street &&
      data.number &&
      data.district &&
      data.city &&
      data.state &&
      data.country
    ) {
      const existingAddress =
        await this.addressRepository.findByAthleteId(profileId)
      const addressPayload = {
        zipCode: data.zipCode,
        street: data.street,
        number: data.number,
        district: data.district,
        city: data.city,
        state: data.state,
        country: data.country,
        ...(data.complement !== undefined
          ? { complement: data.complement }
          : {}),
      }
      if (existingAddress) {
        await this.addressRepository.update(profileId, addressPayload)
      } else {
        await this.addressRepository.create({
          athleteId: profileId,
          ...addressPayload,
        })
      }
    }

    await this.usersRepository.updateProfile(data.userId, true)

    return {
      athleteProfile: {
        id: athleteProfile.id,
        userId: athleteProfile.userId,
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
  }
}
