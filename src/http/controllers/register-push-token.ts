import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaPushTokensRepository } from '../repositories/prisma/prisma-push-tokens-repository.js'
import { InvalidPushTokenError } from '../use-cases/errors/invalid-push-token-error.js'
import { RegisterPushTokenUseCase } from '../use-cases/register-push-token.js'

const bodySchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['IOS', 'ANDROID']),
  deviceName: z.string().trim().min(1).max(120).optional(),
  deviceId: z.string().trim().min(1).max(120).optional(),
  appVersion: z.string().trim().min(1).max(40).optional(),
})

export async function registerPushToken(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = bodySchema.parse(request.body)

  const useCase = new RegisterPushTokenUseCase(new PrismaPushTokensRepository())

  try {
    const { pushToken } = await useCase.execute({
      userId: request.user.sub,
      ...body,
    })
    return reply.status(201).send({ id: pushToken.id, token: pushToken.token })
  } catch (error) {
    if (error instanceof InvalidPushTokenError) {
      return reply
        .status(400)
        .send({ message: 'Formato de push token inválido.' })
    }
    throw error
  }
}
