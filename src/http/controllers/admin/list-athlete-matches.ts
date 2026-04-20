import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaAthleteProfileRepository } from '../../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaMatchRepository } from '../../repositories/prisma/prisma-match-repository.js'
import {
  AthleteNotFoundError,
  ListAthleteMatchesAdminUseCase,
} from '../../use-cases/admin/list-athlete-matches.js'

const paramsSchema = z.object({
  athleteId: z.string().uuid(),
})

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  competitionId: z.string().uuid().optional(),
  status: z
    .enum(['SCHEDULED', 'LIVE', 'FINISHED', 'CANCELLED'])
    .optional(),
  result: z.enum(['WIN', 'LOSS', 'DRAW', 'NOT_FINISHED']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})

export async function listAthleteMatchesAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { athleteId } = paramsSchema.parse(request.params)
  const query = querySchema.parse(request.query)

  const matchRepository = new PrismaMatchRepository()
  const athleteProfileRepository = new PrismaAthleteProfileRepository()
  const useCase = new ListAthleteMatchesAdminUseCase(
    matchRepository,
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
