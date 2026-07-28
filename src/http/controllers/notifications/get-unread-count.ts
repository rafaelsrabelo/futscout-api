import type { FastifyReply, FastifyRequest } from 'fastify'
import { PrismaUserNotificationRepository } from '../../repositories/prisma/prisma-user-notification-repository.js'

/** Endpoint enxuto para o badge — o app chama com frequência. */
export async function getUnreadNotificationCount(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const repository = new PrismaUserNotificationRepository()
  const unreadCount = await repository.countUnread(request.user.sub)

  return reply.status(200).send({ unreadCount })
}
