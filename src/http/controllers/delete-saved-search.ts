import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaSavedSearchRepository } from '../repositories/prisma/prisma-saved-search-repository.js'
import { DeleteSavedSearchUseCase } from '../use-cases/delete-saved-search.js'
import { SavedSearchNotFoundError } from '../use-cases/errors/saved-search-not-found-error.js'
import { UnauthorizedError } from '../use-cases/errors/unauthorized-error.js'

export async function deleteSavedSearch(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const deleteSavedSearchParamsSchema = z.object({
    id: z.string().uuid(),
  })

  const { id } = deleteSavedSearchParamsSchema.parse(request.params)

  try {
    const savedSearchRepository = new PrismaSavedSearchRepository()
    const deleteSavedSearchUseCase = new DeleteSavedSearchUseCase(
      savedSearchRepository,
    )

    await deleteSavedSearchUseCase.execute({
      id,
      userId: request.user.sub,
    })

    return reply.status(204).send()
  } catch (err) {
    if (err instanceof SavedSearchNotFoundError) {
      return reply.status(404).send({ message: err.message })
    }

    if (err instanceof UnauthorizedError) {
      return reply.status(403).send({ message: err.message })
    }

    throw err
  }
}
