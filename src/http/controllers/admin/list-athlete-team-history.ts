import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaAthleteProfileRepository } from '../../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaTeamHistoryRepository } from '../../repositories/prisma/prisma-team-history-repository.js'
import { AthleteNotFoundError } from '../../use-cases/admin/list-athlete-matches.js'
import { ListAthleteTeamHistoryAdminUseCase } from '../../use-cases/admin/list-athlete-team-history.js'

const paramsSchema = z.object({
  athleteId: z.string().uuid(),
})

export async function listAthleteTeamHistoryAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { athleteId } = paramsSchema.parse(request.params)

  const teamHistoryRepository = new PrismaTeamHistoryRepository()
  const athleteProfileRepository = new PrismaAthleteProfileRepository()
  const useCase = new ListAthleteTeamHistoryAdminUseCase(
    teamHistoryRepository,
    athleteProfileRepository,
  )

  try {
    const result = await useCase.execute({ athleteProfileId: athleteId })
    return reply.status(200).send(result)
  } catch (error) {
    if (error instanceof AthleteNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}
