import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaAthleteProfileRepository } from '../../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaMatchRepository } from '../../repositories/prisma/prisma-match-repository.js'
import { SearchAdminUseCase } from '../../use-cases/admin/search.js'

const querySchema = z.object({
  q: z.string().trim().min(2, 'O termo de busca precisa ter ao menos 2 caracteres.'),
  limit: z.coerce.number().int().min(1).max(20).optional().default(5),
})

export async function searchAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { q, limit } = querySchema.parse(request.query)

  const athleteProfileRepository = new PrismaAthleteProfileRepository()
  const matchRepository = new PrismaMatchRepository()
  const useCase = new SearchAdminUseCase(
    athleteProfileRepository,
    matchRepository,
  )

  const result = await useCase.execute({ q, limit })
  return reply.status(200).send(result)
}
