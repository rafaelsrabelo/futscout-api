import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaNotificationLogsRepository } from '../../repositories/prisma/prisma-notification-logs-repository.js'
import { ListNotificationsAdminUseCase } from '../../use-cases/admin/list-notifications.js'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export async function listNotificationsAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { page, pageSize } = querySchema.parse(request.query)

  const useCase = new ListNotificationsAdminUseCase(
    new PrismaNotificationLogsRepository(),
  )

  const result = await useCase.execute({ page, pageSize })
  return reply.status(200).send(result)
}
