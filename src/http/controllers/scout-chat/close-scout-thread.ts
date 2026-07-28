import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { PrismaScoutChatRepository } from '../../repositories/prisma/prisma-scout-chat-repository.js'
import { ScoutThreadNotFoundError } from '../../use-cases/errors/scout-thread-not-found-error.js'
import { CloseScoutThreadUseCase } from '../../use-cases/scout-chat/close-scout-thread.js'

export async function closeScoutThread(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const closeScoutThreadParamsSchema = z.object({
    id: z.string().uuid(),
  })

  if (request.user.role !== 'OBSERVER') {
    return reply.status(403).send({
      message: 'Only observers can use the athlete search chat',
    })
  }

  const { id } = closeScoutThreadParamsSchema.parse(request.params)

  try {
    const scoutChatRepository = new PrismaScoutChatRepository()
    const closeScoutThreadUseCase = new CloseScoutThreadUseCase(
      scoutChatRepository,
    )

    await closeScoutThreadUseCase.execute({
      threadId: id,
      userId: request.user.sub,
    })

    return reply.status(204).send()
  } catch (err) {
    if (err instanceof ScoutThreadNotFoundError) {
      return reply.status(404).send({ message: err.message })
    }

    throw err
  }
}
