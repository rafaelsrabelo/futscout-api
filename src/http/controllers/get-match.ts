import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaMatchRepository } from '../repositories/prisma/prisma-match-repository.js'
import { GetMatchUseCase } from '../use-cases/get-match.js'

export async function getMatch(request: FastifyRequest, reply: FastifyReply) {
  const getMatchParamsSchema = z.object({
    id: z.string().uuid(),
  })

  const getMatchQuerySchema = z.object({
    includePlays: z
      .string()
      .optional()
      .transform((val) => val === 'true'),
  })

  const { id } = getMatchParamsSchema.parse(request.params)
  const { includePlays } = getMatchQuerySchema.parse(request.query)

  const matchRepository = new PrismaMatchRepository()
  const athleteProfileRepository = new PrismaAthleteProfileRepository()
  const getMatchUseCase = new GetMatchUseCase(
    matchRepository,
    athleteProfileRepository,
  )

  const match = await getMatchUseCase.execute({
    matchId: id,
    userId: request.user.sub,
    includePlays,
  })

  // Adicionar informações de competição/amistoso
  const matchWithCompetition = match as typeof match & {
    competitionId?: string | null
    competition?: {
      id: string
      name: string
      description: string | null
      startDate: Date | null
      endDate: Date | null
    } | null
  }

  const enrichedMatch = {
    ...matchWithCompetition,
    isFriendly: !matchWithCompetition.competitionId,
    competitionName: matchWithCompetition.competition?.name || null,
  }

  return reply.send({ match: enrichedMatch })
}
