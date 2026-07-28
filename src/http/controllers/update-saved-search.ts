import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaSavedSearchRepository } from '../repositories/prisma/prisma-saved-search-repository.js'
import { UpdateSavedSearchUseCase } from '../use-cases/update-saved-search.js'
import { SavedSearchNotFoundError } from '../use-cases/errors/saved-search-not-found-error.js'
import { UnauthorizedError } from '../use-cases/errors/unauthorized-error.js'

export async function updateSavedSearch(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const updateSavedSearchParamsSchema = z.object({
    id: z.string().uuid(),
  })

  const updateSavedSearchBodySchema = z.object({
    title: z.string().optional(),
    description: z.string().nullable().optional(),
    filters: z
      .object({
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
        minHeight: z.number().positive().optional(),
        maxHeight: z.number().positive().optional(),
        minWeight: z.number().positive().optional(),
        maxWeight: z.number().positive().optional(),
        // Idade entra aqui porque o chat salva buscas por faixa de idade; sem
        // isto, editar pelo app apagaria o critério silenciosamente.
        minAge: z.number().int().min(0).max(60).optional(),
        maxAge: z.number().int().min(0).max(60).optional(),
      })
      .optional(),
    isActive: z.boolean().optional(),
  })

  // Verificar se o usuário é Observer
  if (request.user.role !== 'OBSERVER') {
    return reply.status(403).send({
      message: 'Only observers can update saved searches',
    })
  }

  const { id } = updateSavedSearchParamsSchema.parse(request.params)
  const { title, description, filters, isActive } =
    updateSavedSearchBodySchema.parse(request.body)

  try {
    const savedSearchRepository = new PrismaSavedSearchRepository()
    const updateSavedSearchUseCase = new UpdateSavedSearchUseCase(
      savedSearchRepository,
    )

    // Preparar dados apenas com propriedades definidas
    const updateData: {
      id: string
      userId: string
      title?: string
      description?: string | null
      filters?: Record<string, unknown>
      isActive?: boolean
    } = { id, userId: request.user.sub }

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (isActive !== undefined) updateData.isActive = isActive

    if (filters !== undefined) {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== undefined),
      )
      updateData.filters = cleanFilters
    }

    const { savedSearch } = await updateSavedSearchUseCase.execute(updateData)

    return reply.status(200).send({
      savedSearch,
    })
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
