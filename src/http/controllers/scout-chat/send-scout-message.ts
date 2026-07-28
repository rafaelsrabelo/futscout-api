import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { ScoutChatDisabledError } from '../../use-cases/errors/scout-chat-disabled-error.js'
import { ScoutThreadNotFoundError } from '../../use-cases/errors/scout-thread-not-found-error.js'
import { makeSendScoutMessageUseCase } from '../../use-cases/scout-chat/make-send-scout-message.js'
import { incrementAiMessageUsage } from '../../utils/increment-usage.js'

export async function sendScoutMessage(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const sendScoutMessageBodySchema = z.object({
    message: z.string().min(1).max(1000),
    // Ausente ou null abre conversa nova.
    threadId: z.string().uuid().nullish(),
  })

  if (request.user.role !== 'OBSERVER') {
    return reply.status(403).send({
      message: 'Only observers can use the athlete search chat',
    })
  }

  const { message, threadId } = sendScoutMessageBodySchema.parse(request.body)

  try {
    const sendScoutMessageUseCase = makeSendScoutMessageUseCase()

    const result = await sendScoutMessageUseCase.execute({
      userId: request.user.sub,
      message,
      ...(threadId ? { threadId } : {}),
    })

    // Só conta depois do turno completar: turno que falhou não gasta cota.
    await incrementAiMessageUsage(request.user.sub)

    return reply.status(200).send(result)
  } catch (err) {
    if (err instanceof ScoutThreadNotFoundError) {
      return reply.status(404).send({ message: err.message })
    }

    if (err instanceof ScoutChatDisabledError) {
      return reply.status(503).send({
        message: 'O chat de busca está indisponível no momento.',
      })
    }

    throw err
  }
}
