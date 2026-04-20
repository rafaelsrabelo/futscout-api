import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaMatchRepository } from '../../repositories/prisma/prisma-match-repository.js'
import { ListMatchesAdminUseCase } from '../../use-cases/admin/list-matches.js'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().min(1).optional(),
  athleteId: z.string().uuid().optional(),
  primaryPosition: z
    .enum(['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'])
    .optional(),
  minAge: z.coerce.number().int().min(0).max(120).optional(),
  maxAge: z.coerce.number().int().min(0).max(120).optional(),
  competitionId: z.string().uuid().optional(),
  status: z.enum(['SCHEDULED', 'LIVE', 'FINISHED', 'CANCELLED']).optional(),
  result: z.enum(['WIN', 'LOSS', 'DRAW', 'NOT_FINISHED']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})

export async function listMatchesAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const query = querySchema.parse(request.query)

  if (
    query.minAge !== undefined &&
    query.maxAge !== undefined &&
    query.minAge > query.maxAge
  ) {
    return reply
      .status(400)
      .send({ message: 'minAge não pode ser maior que maxAge.' })
  }

  const matchRepository = new PrismaMatchRepository()
  const useCase = new ListMatchesAdminUseCase(matchRepository)

  const result = await useCase.execute(query)
  return reply.status(200).send(result)
}
