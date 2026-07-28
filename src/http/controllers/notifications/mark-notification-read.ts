import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { PrismaUserNotificationRepository } from '../../repositories/prisma/prisma-user-notification-repository.js'
import { NotificationNotFoundError } from '../../use-cases/errors/notification-not-found-error.js'
import { MarkNotificationReadUseCase } from '../../use-cases/notifications/mark-notification-read.js'

export async function markNotificationRead(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const paramsSchema = z.object({
    id: z.string().uuid(),
  })

  const { id } = paramsSchema.parse(request.params)

  try {
    const useCase = new MarkNotificationReadUseCase(
      new PrismaUserNotificationRepository(),
    )

    const result = await useCase.execute({
      notificationId: id,
      userId: request.user.sub,
    })

    return reply.status(200).send(result)
  } catch (err) {
    if (err instanceof NotificationNotFoundError) {
      return reply.status(404).send({ message: err.message })
    }

    throw err
  }
}
