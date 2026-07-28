import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { CreateSavedSearchUseCase } from '../use-cases/create-saved-search.js'
import { PrismaSavedSearchRepository } from '../repositories/prisma/prisma-saved-search-repository.js'

export async function createSavedSearch(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const createSavedSearchBodySchema = z.object({
    title: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    filters: z.object({
      gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
      dominantFoot: z.enum(['RIGHT', 'LEFT']).optional(),
      primaryPosition: z
        .enum(['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'])
        .optional(),
      secondaryPosition: z
        .enum(['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'])
        .optional(),
      classification: z.enum(['DESENVOLVIMENTO', 'PERFORMANCE']).optional(),
      currentClub: z.string().optional(),
      nickname: z.string().optional(),
      name: z.string().optional(),
      hasManager: z.boolean().optional(),
      minHeight: z.number().min(0).optional(),
      maxHeight: z.number().min(0).optional(),
      minWeight: z.number().min(0).optional(),
      maxWeight: z.number().min(0).optional(),
      minAge: z.number().int().min(0).max(60).optional(),
      maxAge: z.number().int().min(0).max(60).optional(),
    }),
  })

  // Verificar se o usuário é Observer
  if (request.user.role !== 'OBSERVER') {
    return reply.status(403).send({
      message: 'Only observers can create saved searches',
    })
  }

  const { title, description, filters } = createSavedSearchBodySchema.parse(
    request.body,
  )

  try {
    const savedSearchRepository = new PrismaSavedSearchRepository()
    const createSavedSearchUseCase = new CreateSavedSearchUseCase(
      savedSearchRepository,
    )

    // Remove undefined values from filters
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== undefined),
    )

    const { savedSearch } = await createSavedSearchUseCase.execute({
      userId: request.user.sub,
      title,
      ...(description && { description }),
      filters: cleanFilters,
    })

    return reply.status(201).send({
      savedSearch: {
        id: savedSearch.id,
        title: savedSearch.title,
        description: savedSearch.description,
        filters: savedSearch.filters,
        isActive: savedSearch.isActive,
        createdAt: savedSearch.createdAt,
      },
    })
  } catch (err) {
    if (err instanceof Error) {
      if (
        err.message === 'Title is required' ||
        err.message === 'At least one filter is required'
      ) {
        return reply.status(400).send({ message: err.message })
      }
    }

    throw err
  }
}
