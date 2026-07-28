import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { PrismaSavedSearchRepository } from '../../repositories/prisma/prisma-saved-search-repository.js'
import { PrismaScoutChatRepository } from '../../repositories/prisma/prisma-scout-chat-repository.js'
import { ScoutMessageHasNoFiltersError } from '../../use-cases/errors/scout-message-has-no-filters-error.js'
import { ScoutMessageNotFoundError } from '../../use-cases/errors/scout-message-not-found-error.js'
import { SaveSearchFromMessageUseCase } from '../../use-cases/scout-chat/save-search-from-message.js'

export async function saveSearchFromMessage(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const paramsSchema = z.object({
    messageId: z.string().uuid(),
  })

  const bodySchema = z.object({
    title: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
  })

  if (request.user.role !== 'OBSERVER') {
    return reply.status(403).send({
      message: 'Only observers can use the athlete search chat',
    })
  }

  const { messageId } = paramsSchema.parse(request.params)
  const { title, description } = bodySchema.parse(request.body)

  try {
    const useCase = new SaveSearchFromMessageUseCase(
      new PrismaScoutChatRepository(),
      new PrismaSavedSearchRepository(),
    )

    const { savedSearch } = await useCase.execute({
      messageId,
      userId: request.user.sub,
      title,
      ...(description && { description }),
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
    if (err instanceof ScoutMessageNotFoundError) {
      return reply.status(404).send({ message: err.message })
    }

    if (err instanceof ScoutMessageHasNoFiltersError) {
      return reply.status(400).send({
        message: 'Essa mensagem não tem filtros de busca para salvar.',
      })
    }

    throw err
  }
}
