import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaAchievementRepository } from '../../repositories/prisma/prisma-achievement-repository.js'
import {
  AchievementNotFoundError,
  UpdateAchievementAdminUseCase,
} from '../../use-cases/admin/update-achievement.js'

const paramsSchema = z.object({
  id: z.uuid('ID inválido.'),
})

const bodySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  category: z.string().min(1).max(60).optional(),
  year: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1)
    .optional(),
  type: z.enum(['COLLECTIVE', 'INDIVIDUAL']).optional(),
})

export async function updateAchievementAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = paramsSchema.parse(request.params)
  const body = bodySchema.parse(request.body)

  const useCase = new UpdateAchievementAdminUseCase(
    new PrismaAchievementRepository(),
  )

  try {
    const achievement = await useCase.execute({ achievementId: id, ...body })
    return reply.status(200).send(achievement)
  } catch (error) {
    if (error instanceof AchievementNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}
