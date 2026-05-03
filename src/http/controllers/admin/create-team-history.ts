import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaAthleteProfileRepository } from '../../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaTeamHistoryRepository } from '../../repositories/prisma/prisma-team-history-repository.js'
import { PrismaTeamRepository } from '../../repositories/prisma/prisma-team-repository.js'
import {
  AthleteNotFoundError,
  CreateTeamHistoryAdminUseCase,
  InvalidTeamHistoryPeriodError,
  TeamNotFoundError,
} from '../../use-cases/admin/create-team-history.js'

const paramsSchema = z.object({
  athleteId: z.uuid('athleteId inválido.'),
})

const bodySchema = z.object({
  teamId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().nullable().optional(),
})

export async function createTeamHistoryAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { athleteId } = paramsSchema.parse(request.params)
  const body = bodySchema.parse(request.body)

  const useCase = new CreateTeamHistoryAdminUseCase(
    new PrismaTeamHistoryRepository(),
    new PrismaAthleteProfileRepository(),
    new PrismaTeamRepository(),
  )

  try {
    const entry = await useCase.execute({
      athleteProfileId: athleteId,
      teamId: body.teamId,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
    })
    return reply.status(201).send(entry)
  } catch (error) {
    if (error instanceof AthleteNotFoundError) {
      return reply.status(404).send({ message: 'Atleta não encontrado.' })
    }
    if (error instanceof TeamNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    if (error instanceof InvalidTeamHistoryPeriodError) {
      return reply.status(400).send({ message: error.message })
    }
    throw error
  }
}
