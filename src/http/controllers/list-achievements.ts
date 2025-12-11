import type { FastifyReply, FastifyRequest } from 'fastify'
import { PrismaAchievementRepository } from '../repositories/prisma/prisma-achievement-repository.js'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { ListAchievementsUseCase } from '../use-cases/list-achievements.js'

export async function listAchievements(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const achievementRepository = new PrismaAchievementRepository()
    const athleteProfileRepository = new PrismaAthleteProfileRepository()

    const listAchievementsUseCase = new ListAchievementsUseCase(
      achievementRepository,
      athleteProfileRepository,
    )

    const { achievements } = await listAchievementsUseCase.execute({
      userId: request.user.sub,
    })

    return reply.status(200).send({ achievements })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Athlete profile not found'
    ) {
      return reply.status(404).send({
        message: 'Athlete profile not found. Please create your profile first.',
      })
    }

    return reply.status(500).send({ message: 'Internal server error' })
  }
}

