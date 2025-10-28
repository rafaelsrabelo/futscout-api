import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { EditAthleteProfileUseCase } from '../use-cases/edit-athlete-profile.js'

export async function editAthleteProfile(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const editAthleteProfileBodySchema = z.object({
    nickname: z.string().min(2).max(50).optional(),
    profilePhoto: z.string().url().optional(),
    instagramUrl: z.string().url().optional(),
    twitterUrl: z.string().url().optional(),
    height: z.number().min(100).max(250).optional(),
    weight: z.number().min(30).max(200).optional(),
    dominantFoot: z.enum(['RIGHT', 'LEFT']).optional(),
    primaryPosition: z
      .enum(['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'])
      .optional(),
    secondaryPosition: z
      .enum(['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'])
      .nullable()
      .optional(),
    currentClub: z.string().max(100).optional(),
    biography: z.string().max(500).optional(),
    hasManager: z.boolean().optional(),
    managerName: z.string().max(100).nullable().optional(),
    managerCompany: z.string().max(100).nullable().optional(),
    managerContact: z.string().max(100).nullable().optional(),
  })

  try {
    const profileData = editAthleteProfileBodySchema.parse(request.body)
    const userId = request.user.sub

    const athleteProfileRepository = new PrismaAthleteProfileRepository()
    const editAthleteProfileUseCase = new EditAthleteProfileUseCase(
      athleteProfileRepository,
    )

    const { athleteProfile } = await editAthleteProfileUseCase.execute({
      userId,
      ...profileData,
    })

    return reply.status(200).send({
      athleteProfile: {
        id: athleteProfile.id,
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
        instagramUrl: athleteProfile.instagramUrl,
        twitterUrl: athleteProfile.twitterUrl,
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
