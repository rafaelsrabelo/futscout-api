import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaTeamHistoryRepository } from '../../repositories/prisma/prisma-team-history-repository.js'
import {
  DeleteTeamHistoryAdminUseCase,
  TeamHistoryNotFoundError,
} from '../../use-cases/admin/delete-team-history.js'

const paramsSchema = z.object({
  id: z.uuid('ID inválido.'),
})

export async function deleteTeamHistoryAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = paramsSchema.parse(request.params)

  const useCase = new DeleteTeamHistoryAdminUseCase(
    new PrismaTeamHistoryRepository(),
  )

  try {
    await useCase.execute({ teamHistoryId: id })
    return reply.status(204).send()
  } catch (error) {
    if (error instanceof TeamHistoryNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}
