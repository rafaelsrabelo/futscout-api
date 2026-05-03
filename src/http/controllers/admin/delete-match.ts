import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaMatchRepository } from '../../repositories/prisma/prisma-match-repository.js'
import {
  DeleteMatchAdminUseCase,
  MatchNotFoundError,
} from '../../use-cases/admin/delete-match.js'

const paramsSchema = z.object({
  id: z.uuid('ID inválido.'),
})

export async function deleteMatchAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = paramsSchema.parse(request.params)

  const useCase = new DeleteMatchAdminUseCase(new PrismaMatchRepository())

  try {
    await useCase.execute({ matchId: id })
    return reply.status(204).send()
  } catch (error) {
    if (error instanceof MatchNotFoundError) {
      return reply.status(404).send({ message: 'Partida não encontrada.' })
    }
    throw error
  }
}
