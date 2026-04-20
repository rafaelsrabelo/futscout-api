import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaAchievementRepository } from '../../repositories/prisma/prisma-achievement-repository.js'
import { PrismaAthleteProfileRepository } from '../../repositories/prisma/prisma-athlete-profile-repository.js'
import { AthleteNotFoundError } from '../../use-cases/admin/list-athlete-matches.js'
import { ListAthleteAchievementsAdminUseCase } from '../../use-cases/admin/list-athlete-achievements.js'

const paramsSchema = z.object({
  athleteId: z.string().uuid(),
})

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(['COLLECTIVE', 'INDIVIDUAL']).optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
})

export async function listAthleteAchievementsAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { athleteId } = paramsSchema.parse(request.params)
  const query = querySchema.parse(request.query)

  const achievementRepository = new PrismaAchievementRepository()
  const athleteProfileRepository = new PrismaAthleteProfileRepository()
  const useCase = new ListAthleteAchievementsAdminUseCase(
    achievementRepository,
    athleteProfileRepository,
  )

  try {
    const result = await useCase.execute({
      athleteProfileId: athleteId,
      ...query,
    })
    return reply.status(200).send(result)
  } catch (error) {
    if (error instanceof AthleteNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}
