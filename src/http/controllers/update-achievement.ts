import type { FastifyReply, FastifyRequest } from 'fastify'
import z from 'zod'
import { PrismaAchievementRepository } from '../repositories/prisma/prisma-achievement-repository.js'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { UpdateAchievementUseCase } from '../use-cases/update-achievement.js'

export async function updateAchievement(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const updateAchievementParamsSchema = z.object({
    id: z.string().uuid(),
  })

  const updateAchievementBodySchema = z.object({
    name: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    year: z
      .number()
      .int()
      .min(1900)
      .max(new Date().getFullYear() + 1)
      .optional(),
    type: z.enum(['COLLECTIVE', 'INDIVIDUAL']).optional(),
  })

  try {
    const { id } = updateAchievementParamsSchema.parse(request.params)
    const body = updateAchievementBodySchema.parse(request.body)

    const achievementRepository = new PrismaAchievementRepository()
    const athleteProfileRepository = new PrismaAthleteProfileRepository()

    const updateAchievementUseCase = new UpdateAchievementUseCase(
      achievementRepository,
      athleteProfileRepository,
    )

    const { achievement } = await updateAchievementUseCase.execute({
      userId: request.user.sub,
      achievementId: id,
      ...body,
    })

    return reply.status(200).send({ achievement })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Athlete profile not found'
    ) {
      return reply.status(404).send({
        message: 'Athlete profile not found. Please create your profile first.',
      })
    }

    if (
      error instanceof Error &&
      error.message === 'Achievement not found'
    ) {
      return reply.status(404).send({
        message: 'Achievement not found',
      })
    }

    if (
      error instanceof Error &&
      error.message === 'Unauthorized to update this achievement'
    ) {
      return reply.status(403).send({
        message: 'Unauthorized to update this achievement',
      })
    }

    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        message: 'Validation error',
        errors: error.errors,
      })
    }

    return reply.status(500).send({ message: 'Internal server error' })
  }
}

