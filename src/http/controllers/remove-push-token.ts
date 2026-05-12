import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaPushTokensRepository } from '../repositories/prisma/prisma-push-tokens-repository.js'
import { RemovePushTokenUseCase } from '../use-cases/remove-push-token.js'

const paramsSchema = z.object({ token: z.string().min(1) })

export async function removePushToken(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { token } = paramsSchema.parse(request.params)

  const useCase = new RemovePushTokenUseCase(new PrismaPushTokensRepository())
  await useCase.execute({ userId: request.user.sub, token })

  return reply.status(204).send()
}
