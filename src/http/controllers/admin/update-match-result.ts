import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaMatchRepository } from '../../repositories/prisma/prisma-match-repository.js'
import {
  MatchNotFoundError,
  UpdateMatchResultAdminUseCase,
} from '../../use-cases/admin/update-match-result.js'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const bodySchema = z.object({
  myTeamScore: z.number().int().min(0).optional(),
  adversaryScore: z.number().int().min(0).optional(),
  result: z.enum(['WIN', 'LOSS', 'DRAW', 'NOT_FINISHED']).optional(),
  status: z.enum(['SCHEDULED', 'LIVE', 'FINISHED', 'CANCELLED']).optional(),
})

export async function updateMatchResultAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = paramsSchema.parse(request.params)
  const body = bodySchema.parse(request.body)

  const matchRepository = new PrismaMatchRepository()
  const useCase = new UpdateMatchResultAdminUseCase(matchRepository)

  try {
    const match = await useCase.execute({ matchId: id, ...body })
    return reply.status(200).send({ match })
  } catch (error) {
    if (error instanceof MatchNotFoundError) {
      return reply.status(404).send({ message: 'Partida não encontrada.' })
    }
    throw error
  }
}
