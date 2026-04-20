import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaMatchRepository } from '../../repositories/prisma/prisma-match-repository.js'
import {
  GetMatchAdminUseCase,
  MatchNotFoundError,
} from '../../use-cases/admin/get-match.js'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

export async function getMatchAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = paramsSchema.parse(request.params)

  const matchRepository = new PrismaMatchRepository()
  const useCase = new GetMatchAdminUseCase(matchRepository)

  try {
    const match = await useCase.execute({ matchId: id })
    return reply.status(200).send({ match })
  } catch (error) {
    if (error instanceof MatchNotFoundError) {
      return reply.status(404).send({ message: 'Partida não encontrada.' })
    }
    throw error
  }
}
