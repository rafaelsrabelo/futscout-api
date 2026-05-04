import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaRefreshTokenRepository } from '../../repositories/prisma/prisma-refresh-token-repository.js'
import { PrismaUsersRepository } from '../../repositories/prisma/prisma-users-repository.js'
import { UserNotFoundError } from '../../use-cases/admin/errors/user-not-found-error.js'
import { ResetUserPasswordAdminUseCase } from '../../use-cases/admin/reset-user-password.js'

const paramsSchema = z.object({ id: z.uuid('ID inválido.') })
const bodySchema = z.object({ password: z.string().min(8).max(128) })

export async function resetUserPasswordAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = paramsSchema.parse(request.params)
  const { password } = bodySchema.parse(request.body)

  const useCase = new ResetUserPasswordAdminUseCase(
    new PrismaUsersRepository(),
    new PrismaRefreshTokenRepository(),
  )

  try {
    await useCase.execute({ userId: id, newPassword: password })
    return reply.status(204).send()
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return reply.status(404).send({ message: 'Usuário não encontrado.' })
    }
    throw error
  }
}
