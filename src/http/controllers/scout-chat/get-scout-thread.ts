import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { PrismaScoutChatRepository } from '../../repositories/prisma/prisma-scout-chat-repository.js'
import { ScoutThreadNotFoundError } from '../../use-cases/errors/scout-thread-not-found-error.js'
import { GetScoutThreadUseCase } from '../../use-cases/scout-chat/get-scout-thread.js'

export async function getScoutThread(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const getScoutThreadParamsSchema = z.object({
    id: z.string().uuid(),
  })

  if (request.user.role !== 'OBSERVER') {
    return reply.status(403).send({
      message: 'Only observers can use the athlete search chat',
    })
  }

  const { id } = getScoutThreadParamsSchema.parse(request.params)

  try {
    const scoutChatRepository = new PrismaScoutChatRepository()
    const getScoutThreadUseCase = new GetScoutThreadUseCase(scoutChatRepository)

    const result = await getScoutThreadUseCase.execute({
      threadId: id,
      userId: request.user.sub,
    })

    return reply.status(200).send(result)
  } catch (err) {
    if (err instanceof ScoutThreadNotFoundError) {
      return reply.status(404).send({ message: err.message })
    }

    throw err
  }
}
