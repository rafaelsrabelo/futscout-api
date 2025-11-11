import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { ExecuteSavedSearchUseCase } from '../use-cases/execute-saved-search.js'
import { PrismaSavedSearchRepository } from '../repositories/prisma/prisma-saved-search-repository.js'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'

export async function executeSavedSearch(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const executeSavedSearchParamsSchema = z.object({
    id: z.string().uuid(),
  })

  const executeSavedSearchQuerySchema = z.object({
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
  })

  // Verificar se o usuário é Observer
  if (request.user.role !== 'OBSERVER') {
    return reply.status(403).send({
      message: 'Only observers can execute saved searches',
    })
  }

  const { id } = executeSavedSearchParamsSchema.parse(request.params)
  const { page, limit } = executeSavedSearchQuerySchema.parse(request.query)

  try {
    const savedSearchRepository = new PrismaSavedSearchRepository()
    const athleteProfileRepository = new PrismaAthleteProfileRepository()
    const executeSavedSearchUseCase = new ExecuteSavedSearchUseCase(
      savedSearchRepository,
      athleteProfileRepository,
    )

    const result = await executeSavedSearchUseCase.execute({
      savedSearchId: id,
      userId: request.user.sub,
      ...(page && { page }),
      ...(limit && { limit }),
    })

    return reply.status(200).send(result)
  } catch (err) {
    if (err instanceof Error) {
      if (
        err.message === 'Saved search not found' ||
        err.message === 'Unauthorized access to saved search'
      ) {
        return reply.status(404).send({ message: err.message })
      }
    }

    throw err
  }
}
