import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { ListMyMatchesUseCase } from '../use-cases/list-my-matches.js'
import { PrismaMatchRepository } from '../repositories/prisma/prisma-match-repository.js'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'

export async function listMyMatches(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const listMyMatchesQuerySchema = z.object({
    includePlays: z
      .string()
      .optional()
      .transform((val) => val === 'true'),
    status: z
      .enum(['SCHEDULED', 'LIVE', 'FINISHED', 'CANCELLED', 'ALL'])
      .optional()
      .default('ALL'),
  })

  const { includePlays, status } = listMyMatchesQuerySchema.parse(request.query)

  const matchRepository = new PrismaMatchRepository()
  const athleteProfileRepository = new PrismaAthleteProfileRepository()
  const listMyMatchesUseCase = new ListMyMatchesUseCase(
    matchRepository,
    athleteProfileRepository,
  )

  const matches = await listMyMatchesUseCase.execute({
    userId: request.user.sub,
    includePlays,
    status,
  })

  return reply.send({ matches })
}
