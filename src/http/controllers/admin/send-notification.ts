import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaAthleteProfileRepository } from '../../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaNotificationLogsRepository } from '../../repositories/prisma/prisma-notification-logs-repository.js'
import { PrismaPushTokensRepository } from '../../repositories/prisma/prisma-push-tokens-repository.js'
import { PrismaUsersRepository } from '../../repositories/prisma/prisma-users-repository.js'
import { SendNotificationAdminUseCase } from '../../use-cases/admin/send-notification.js'

const athleteFiltersSchema = z.object({
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  primaryPosition: z
    .enum(['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'])
    .optional(),
  dominantFoot: z.enum(['RIGHT', 'LEFT']).optional(),
  classification: z
    .enum(['DESENVOLVIMENTO', 'PERFORMANCE', 'UNCLASSIFIED'])
    .optional(),
  currentClub: z.string().trim().min(1).optional(),
  minAge: z.coerce.number().int().min(0).max(120).optional(),
  maxAge: z.coerce.number().int().min(0).max(120).optional(),
  minHeight: z.coerce.number().positive().optional(),
  maxHeight: z.coerce.number().positive().optional(),
  minWeight: z.coerce.number().positive().optional(),
  maxWeight: z.coerce.number().positive().optional(),
})

const audienceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ALL') }),
  z.object({
    type: z.literal('USER_IDS'),
    userIds: z.array(z.uuid()).min(1).max(5000),
  }),
  z.object({
    type: z.literal('ATHLETE_FILTER'),
    filters: athleteFiltersSchema,
  }),
])

const bodySchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(240),
  data: z.record(z.string(), z.unknown()).optional(),
  audience: audienceSchema,
  sound: z.union([z.literal('default'), z.null()]).optional(),
  badge: z.coerce.number().int().min(0).optional(),
})

export async function sendNotificationAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = bodySchema.parse(request.body)

  const useCase = new SendNotificationAdminUseCase({
    usersRepository: new PrismaUsersRepository(),
    athleteProfileRepository: new PrismaAthleteProfileRepository(),
    pushTokensRepository: new PrismaPushTokensRepository(),
    notificationLogsRepository: new PrismaNotificationLogsRepository(),
  })

  const result = await useCase.execute({
    title: body.title,
    body: body.body,
    data: body.data,
    audience: body.audience,
    sound: body.sound,
    badge: body.badge,
    sentByUserId: request.user.sub,
  })

  return reply.status(200).send({
    log: { id: result.log.id, createdAt: result.log.createdAt },
    totalRecipients: result.totalRecipients,
    totalWithToken: result.totalWithToken,
    successCount: result.successCount,
    failureCount: result.failureCount,
    invalidTokensRemoved: result.invalidTokensRemoved,
  })
}
