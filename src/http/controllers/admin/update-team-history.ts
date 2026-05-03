import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaTeamHistoryRepository } from '../../repositories/prisma/prisma-team-history-repository.js'
import { PrismaTeamRepository } from '../../repositories/prisma/prisma-team-repository.js'
import {
  InvalidTeamHistoryPeriodError,
  TeamHistoryNotFoundError,
  TeamNotFoundError,
  UpdateTeamHistoryAdminUseCase,
} from '../../use-cases/admin/update-team-history.js'

const paramsSchema = z.object({
  id: z.uuid('ID inválido.'),
})

const bodySchema = z.object({
  teamId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().nullable().optional(),
})

export async function updateTeamHistoryAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = paramsSchema.parse(request.params)
  const body = bodySchema.parse(request.body)

  const useCase = new UpdateTeamHistoryAdminUseCase(
    new PrismaTeamHistoryRepository(),
    new PrismaTeamRepository(),
  )

  try {
    const entry = await useCase.execute({
      teamHistoryId: id,
      teamId: body.teamId,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate:
        body.endDate === undefined
          ? undefined
          : body.endDate === null
            ? null
            : new Date(body.endDate),
    })
    return reply.status(200).send(entry)
  } catch (error) {
    if (error instanceof TeamHistoryNotFoundError) {
      return reply.status(404).send({ message: error.message })
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
