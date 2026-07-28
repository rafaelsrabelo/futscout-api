import type { FastifyReply, FastifyRequest } from 'fastify'
import { PrismaUserNotificationRepository } from '../../repositories/prisma/prisma-user-notification-repository.js'

export async function markAllNotificationsRead(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const repository = new PrismaUserNotificationRepository()
  const markedCount = await repository.markAllAsRead(request.user.sub)

  return reply.status(200).send({ markedCount, unreadCount: 0 })
}
