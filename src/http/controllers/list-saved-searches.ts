import type { FastifyReply, FastifyRequest } from 'fastify'
import { ListSavedSearchesUseCase } from '../use-cases/list-saved-searches.js'
import { PrismaSavedSearchRepository } from '../repositories/prisma/prisma-saved-search-repository.js'

export async function listSavedSearches(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // Verificar se o usuário é Observer
  if (request.user.role !== 'OBSERVER') {
    return reply.status(403).send({
      message: 'Only observers can access saved searches',
    })
  }

  const savedSearchRepository = new PrismaSavedSearchRepository()
  const listSavedSearchesUseCase = new ListSavedSearchesUseCase(
    savedSearchRepository,
  )

  const { savedSearches } = await listSavedSearchesUseCase.execute({
    userId: request.user.sub,
  })

  return reply.status(200).send({
    savedSearches: savedSearches.map((search) => ({
      id: search.id,
      title: search.title,
      description: search.description,
      filters: search.filters,
      isActive: search.isActive,
      createdAt: search.createdAt,
      updatedAt: search.updatedAt,
    })),
  })
}
