import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaMatchRepository } from '../../repositories/prisma/prisma-match-repository.js'
import { PrismaPlayRepository } from '../../repositories/prisma/prisma-play-repository.js'
import {
  ListMatchPlaysAdminUseCase,
  MatchNotFoundError,
} from '../../use-cases/admin/list-match-plays.js'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

export async function listMatchPlaysAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = paramsSchema.parse(request.params)

  const playRepository = new PrismaPlayRepository()
  const matchRepository = new PrismaMatchRepository()
  const useCase = new ListMatchPlaysAdminUseCase(
    playRepository,
    matchRepository,
  )

  try {
    const result = await useCase.execute({ matchId: id })
    return reply.status(200).send(result)
  } catch (error) {
    if (error instanceof MatchNotFoundError) {
      return reply.status(404).send({ message: 'Partida não encontrada.' })
    }
    throw error
  }
}
