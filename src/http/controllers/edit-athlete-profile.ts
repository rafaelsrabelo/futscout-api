import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AthleteProfile } from 'generated/prisma/client.js'
import { z } from 'zod'
import { PrismaAddressRepository } from '../repositories/prisma/prisma-address-repository.js'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaUsersRepository } from '../repositories/prisma/prisma-users-repository.js'
import { EditAthleteProfileUseCase } from '../use-cases/edit-athlete-profile.js'

export async function editAthleteProfile(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const editAthleteProfileBodySchema = z.object({
    name: z.string().min(2).max(100).optional(), // Nome do usuário
    nickname: z.string().min(2).max(50).optional(),
    profilePhoto: z.string().url().optional(),
    // Gênero é editável — atletas importados começam com gender=null
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    birthDate: z.string().datetime().optional(), // Data de nascimento editável
    instagramUrl: z.string().url().optional(),
    twitterUrl: z.string().url().optional(),
    youtubeUrl: z.string().url().optional(),
    height: z.number().min(50).max(250).optional(), // Altura em centímetros (50cm a 250cm)
    weight: z.number().min(10).max(200).optional(), // Peso em quilos (10kg a 200kg)
    dominantFoot: z.enum(['RIGHT', 'LEFT']).optional(),
    primaryPosition: z
      .enum(['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'])
      .optional(),
    secondaryPosition: z
      .enum(['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'])
      .nullable()
      .optional(),
    currentClub: z.string().max(100).nullable().optional(),
    biography: z.string().max(500).optional(),
    hasManager: z.boolean().optional(),
    managerName: z.string().max(100).nullable().optional(),
    managerCompany: z.string().max(100).nullable().optional(),
    managerContact: z.string().max(100).nullable().optional(),
    // Acompanhamentos profissionais
    hasNutritionist: z.boolean().optional(),
    hasPsychologist: z.boolean().optional(),
    hasPersonalTrainer: z.boolean().optional(),
    // Aliases vindos de versões antigas do mobile
    hasNutritionalSupport: z.boolean().optional(),
    hasPsychologicalSupport: z.boolean().optional(),
    // Endereço (opcional)
    address: z
      .object({
        zipCode: z.string().max(10).optional(),
        street: z.string().max(255).optional(),
        number: z.string().max(20).optional(),
        complement: z.string().max(100).optional(),
        district: z.string().max(100).optional(),
        city: z.string().max(100).optional(),
        state: z.string().max(100).optional(),
        country: z.string().max(100).optional(),
      })
      .optional(),
  })

  try {
    const profileData = editAthleteProfileBodySchema.parse(request.body)
    const userId = request.user.sub

    const athleteProfileRepository = new PrismaAthleteProfileRepository()
    const addressRepository = new PrismaAddressRepository()
    const usersRepository = new PrismaUsersRepository()
    const editAthleteProfileUseCase = new EditAthleteProfileUseCase(
      athleteProfileRepository,
      addressRepository,
      usersRepository,
    )

    // Prepare data for use case, excluding undefined values
    // Tratar string vazia em currentClub como null (para permitir limpar o campo)
    // Mergear aliases hasNutritionalSupport/hasPsychologicalSupport vindos de
    // versões antigas do mobile com os nomes canônicos do schema.
    const {
      address,
      currentClub,
      hasNutritionalSupport,
      hasPsychologicalSupport,
      hasNutritionist,
      hasPsychologist,
      ...otherData
    } = profileData
    const mergedNutritionist = hasNutritionist ?? hasNutritionalSupport
    const mergedPsychologist = hasPsychologist ?? hasPsychologicalSupport
    const useCaseRequest = {
      userId,
      ...otherData,
      ...(mergedNutritionist !== undefined && {
        hasNutritionist: mergedNutritionist,
      }),
      ...(mergedPsychologist !== undefined && {
        hasPsychologist: mergedPsychologist,
      }),
      ...(currentClub !== undefined && {
        currentClub: currentClub === '' ? null : currentClub,
      }),
      ...(address !== undefined && { address }),
    }

    const { athleteProfile } =
      await editAthleteProfileUseCase.execute(useCaseRequest)

    // O perfil retornado já inclui o user com o nome atualizado
    const profileWithUser = athleteProfile as AthleteProfile & {
      user?: { name?: string }
    }

    return reply.status(200).send({
      athleteProfile: {
        id: athleteProfile.id,
        name: profileWithUser.user?.name, // Nome do usuário atualizado
        nickname: athleteProfile.nickname,
        profilePhoto: athleteProfile.profilePhoto,
        height: athleteProfile.height,
        weight: athleteProfile.weight,
        dominantFoot: athleteProfile.dominantFoot,
        primaryPosition: athleteProfile.primaryPosition,
        secondaryPosition: athleteProfile.secondaryPosition,
        currentClub: athleteProfile.currentClub,
        biography: athleteProfile.biography,
        hasManager: athleteProfile.hasManager,
        managerName: athleteProfile.managerName,
        managerCompany: athleteProfile.managerCompany,
        managerContact: athleteProfile.managerContact,
        hasNutritionist: athleteProfile.hasNutritionist,
        hasPsychologist: athleteProfile.hasPsychologist,
        hasPersonalTrainer: athleteProfile.hasPersonalTrainer,
        instagramUrl: athleteProfile.instagramUrl,
        twitterUrl: athleteProfile.twitterUrl,
        address: athleteProfile.address,
        updatedAt: athleteProfile.updatedAt,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        message: 'Validation error',
        issues: error.format(),
      })
    }

    if (error instanceof Error) {
      if (error.message === 'Athlete profile not found') {
        return reply.status(404).send({ message: 'Athlete profile not found' })
      }

      if (error.message === 'Nickname already exists') {
        return reply.status(409).send({ message: 'Nickname already exists' })
      }
    }

    return reply.status(500).send({ message: 'Internal server error' })
  }
}
