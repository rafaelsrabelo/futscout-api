import type { FastifyReply, FastifyRequest } from 'fastify'
import z from 'zod'
import { PrismaAchievementRepository } from '../repositories/prisma/prisma-achievement-repository.js'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { DeleteAchievementUseCase } from '../use-cases/delete-achievement.js'

export async function deleteAchievement(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const deleteAchievementParamsSchema = z.object({
    id: z.string().uuid(),
  })

  try {
    const { id } = deleteAchievementParamsSchema.parse(request.params)

    const achievementRepository = new PrismaAchievementRepository()
    const athleteProfileRepository = new PrismaAthleteProfileRepository()

    const deleteAchievementUseCase = new DeleteAchievementUseCase(
      achievementRepository,
      athleteProfileRepository,
    )

    await deleteAchievementUseCase.execute({
      userId: request.user.sub,
      achievementId: id,
    })

    return reply.status(204).send()
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
      error.message === 'Unauthorized to delete this achievement'
    ) {
      return reply.status(403).send({
        message: 'Unauthorized to delete this achievement',
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

