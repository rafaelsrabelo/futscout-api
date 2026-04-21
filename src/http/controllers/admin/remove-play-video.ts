import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaPlayRepository } from '../../repositories/prisma/prisma-play-repository.js'
import {
  PlayNotFoundError,
  RemovePlayVideoAdminUseCase,
} from '../../use-cases/admin/remove-play-video.js'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

export async function removePlayVideoAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = paramsSchema.parse(request.params)

  const playRepository = new PrismaPlayRepository()
  const useCase = new RemovePlayVideoAdminUseCase(playRepository)

  try {
    const play = await useCase.execute({ playId: id })
    return reply.status(200).send(play)
  } catch (error) {
    if (error instanceof PlayNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}
