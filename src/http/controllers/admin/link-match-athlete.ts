import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaAthleteProfileRepository } from '../../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaMatchRepository } from '../../repositories/prisma/prisma-match-repository.js'
import {
  AthleteNotFoundError,
  LinkMatchAthleteAdminUseCase,
  MatchNotFoundError,
} from '../../use-cases/admin/link-match-athlete.js'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const bodySchema = z.object({
  athleteProfileId: z.string().uuid(),
})

export async function linkMatchAthleteAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = paramsSchema.parse(request.params)
  const { athleteProfileId } = bodySchema.parse(request.body)

  const matchRepository = new PrismaMatchRepository()
  const athleteProfileRepository = new PrismaAthleteProfileRepository()
  const useCase = new LinkMatchAthleteAdminUseCase(
    matchRepository,
    athleteProfileRepository,
  )

  try {
    const match = await useCase.execute({
      matchId: id,
      athleteProfileId,
    })
    return reply.status(200).send({ match })
  } catch (error) {
    if (error instanceof MatchNotFoundError) {
      return reply.status(404).send({ message: 'Partida não encontrada.' })
    }
    if (error instanceof AthleteNotFoundError) {
      return reply.status(404).send({ message: 'Atleta não encontrado.' })
    }
    throw error
  }
}
