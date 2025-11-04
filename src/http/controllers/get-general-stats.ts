import type { FastifyReply, FastifyRequest } from 'fastify'
import { GetGeneralStatsUseCase } from '../use-cases/get-general-stats.js'
import { PrismaMatchRepository } from '../repositories/prisma/prisma-match-repository.js'
import { PrismaPlayRepository } from '../repositories/prisma/prisma-play-repository.js'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'

export async function getGeneralStats(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const matchRepository = new PrismaMatchRepository()
  const playRepository = new PrismaPlayRepository()
  const athleteProfileRepository = new PrismaAthleteProfileRepository()

  const getGeneralStatsUseCase = new GetGeneralStatsUseCase(
    matchRepository,
    playRepository,
    athleteProfileRepository,
  )

  const stats = await getGeneralStatsUseCase.execute({
    userId: request.user.sub,
  })

  return reply.send({ stats })
}
