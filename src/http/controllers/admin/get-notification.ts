import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaNotificationLogsRepository } from '../../repositories/prisma/prisma-notification-logs-repository.js'
import { NotificationNotFoundError } from '../../use-cases/errors/notification-not-found-error.js'
import { GetNotificationAdminUseCase } from '../../use-cases/admin/get-notification.js'

const paramsSchema = z.object({ id: z.uuid('ID inválido.') })

export async function getNotificationAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = paramsSchema.parse(request.params)

  const useCase = new GetNotificationAdminUseCase(
    new PrismaNotificationLogsRepository(),
  )

  try {
    const { notification } = await useCase.execute({ id })
    return reply.status(200).send({ notification })
  } catch (error) {
    if (error instanceof NotificationNotFoundError) {
      return reply.status(404).send({ message: 'Notificação não encontrada.' })
    }
    throw error
  }
}
