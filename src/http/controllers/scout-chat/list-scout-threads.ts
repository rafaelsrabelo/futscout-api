import type { FastifyReply, FastifyRequest } from 'fastify'
import { PrismaScoutChatRepository } from '../../repositories/prisma/prisma-scout-chat-repository.js'
import { ListScoutThreadsUseCase } from '../../use-cases/scout-chat/list-scout-threads.js'

export async function listScoutThreads(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (request.user.role !== 'OBSERVER') {
    return reply.status(403).send({
      message: 'Only observers can use the athlete search chat',
    })
  }

  const scoutChatRepository = new PrismaScoutChatRepository()
  const listScoutThreadsUseCase = new ListScoutThreadsUseCase(
    scoutChatRepository,
  )

  const result = await listScoutThreadsUseCase.execute({
    userId: request.user.sub,
  })

  return reply.status(200).send(result)
}
