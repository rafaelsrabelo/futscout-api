import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaPlayRepository } from '../../repositories/prisma/prisma-play-repository.js'
import {
  DeletePlayAdminUseCase,
  PlayNotFoundError,
} from '../../use-cases/admin/delete-play.js'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

export async function deletePlayAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = paramsSchema.parse(request.params)

  const playRepository = new PrismaPlayRepository()
  const useCase = new DeletePlayAdminUseCase(playRepository)

  try {
    await useCase.execute({ playId: id })
    return reply.status(204).send()
  } catch (error) {
    if (error instanceof PlayNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}
