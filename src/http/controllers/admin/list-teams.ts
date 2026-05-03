import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaAthleteProfileRepository } from '../../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaTeamRepository } from '../../repositories/prisma/prisma-team-repository.js'
import {
  AthleteNotFoundError,
  ListTeamsAdminUseCase,
} from '../../use-cases/admin/list-teams.js'

const querySchema = z.object({
  q: z.string().trim().min(1).optional(),
  athleteId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export async function listTeamsAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const query = querySchema.parse(request.query)

  const useCase = new ListTeamsAdminUseCase(
    new PrismaTeamRepository(),
    new PrismaAthleteProfileRepository(),
  )

  try {
    const result = await useCase.execute({
      q: query.q,
      athleteProfileId: query.athleteId,
      page: query.page,
      pageSize: query.pageSize,
    })
    return reply.status(200).send(result)
  } catch (error) {
    if (error instanceof AthleteNotFoundError) {
      return reply.status(404).send({ message: 'Atleta não encontrado.' })
    }
    throw error
  }
}
