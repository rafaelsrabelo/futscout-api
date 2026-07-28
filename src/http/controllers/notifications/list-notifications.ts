import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { PrismaUserNotificationRepository } from '../../repositories/prisma/prisma-user-notification-repository.js'
import { ListUserNotificationsUseCase } from '../../use-cases/notifications/list-user-notifications.js'

export async function listNotifications(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const querySchema = z.object({
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
    onlyUnread: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
  })

  const { page, limit, onlyUnread } = querySchema.parse(request.query)

  const useCase = new ListUserNotificationsUseCase(
    new PrismaUserNotificationRepository(),
  )

  const result = await useCase.execute({
    userId: request.user.sub,
    ...(page && { page }),
    ...(limit && { limit }),
    ...(onlyUnread !== undefined && { onlyUnread }),
  })

  return reply.status(200).send(result)
}
