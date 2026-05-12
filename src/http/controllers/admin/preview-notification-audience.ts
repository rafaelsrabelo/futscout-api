import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaAthleteProfileRepository } from '../../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaPushTokensRepository } from '../../repositories/prisma/prisma-push-tokens-repository.js'
import { PrismaUsersRepository } from '../../repositories/prisma/prisma-users-repository.js'
import { PreviewNotificationAudienceUseCase } from '../../use-cases/admin/preview-notification-audience.js'

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

const bodySchema = z.object({ audience: audienceSchema })

export async function previewNotificationAudienceAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { audience } = bodySchema.parse(request.body)

  const useCase = new PreviewNotificationAudienceUseCase({
    usersRepository: new PrismaUsersRepository(),
    athleteProfileRepository: new PrismaAthleteProfileRepository(),
    pushTokensRepository: new PrismaPushTokensRepository(),
  })

  const result = await useCase.execute({ audience })
  return reply.status(200).send(result)
}
