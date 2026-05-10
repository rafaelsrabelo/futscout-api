import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaAthleteClassificationLogRepository } from '../../repositories/prisma/prisma-athlete-classification-log-repository.js'
import { PrismaAthleteProfileRepository } from '../../repositories/prisma/prisma-athlete-profile-repository.js'
import { AthleteNotFoundError } from '../../use-cases/admin/errors/athlete-not-found-error.js'
import { ListAthleteClassificationHistoryUseCase } from '../../use-cases/admin/list-athlete-classification-history.js'

const paramsSchema = z.object({
  id: z.uuid('ID inválido.'),
})

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export async function listAthleteClassificationHistoryAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = paramsSchema.parse(request.params)
  const { page, pageSize } = querySchema.parse(request.query)

  const useCase = new ListAthleteClassificationHistoryUseCase(
    new PrismaAthleteProfileRepository(),
    new PrismaAthleteClassificationLogRepository(),
  )

  try {
    const result = await useCase.execute({
      athleteProfileId: id,
      page,
      pageSize,
    })
    return reply.status(200).send(result)
  } catch (error) {
    if (error instanceof AthleteNotFoundError) {
      return reply.status(404).send({ message: 'Atleta não encontrado.' })
    }
    throw error
  }
}
