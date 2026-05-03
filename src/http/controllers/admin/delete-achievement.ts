import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaAchievementRepository } from '../../repositories/prisma/prisma-achievement-repository.js'
import {
  AchievementNotFoundError,
  DeleteAchievementAdminUseCase,
} from '../../use-cases/admin/delete-achievement.js'

const paramsSchema = z.object({
  id: z.uuid('ID inválido.'),
})

export async function deleteAchievementAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = paramsSchema.parse(request.params)

  const useCase = new DeleteAchievementAdminUseCase(
    new PrismaAchievementRepository(),
  )

  try {
    await useCase.execute({ achievementId: id })
    return reply.status(204).send()
  } catch (error) {
    if (error instanceof AchievementNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}
