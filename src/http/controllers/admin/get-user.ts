import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaUsersRepository } from '../../repositories/prisma/prisma-users-repository.js'
import { UserNotFoundError } from '../../use-cases/admin/errors/user-not-found-error.js'
import { GetUserAdminUseCase } from '../../use-cases/admin/get-user.js'

const paramsSchema = z.object({ id: z.uuid('ID inválido.') })

export async function getUserAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = paramsSchema.parse(request.params)

  const useCase = new GetUserAdminUseCase(new PrismaUsersRepository())

  try {
    const detail = await useCase.execute({ userId: id })
    const { user, athleteProfileId, observerProfileId, activePlan } = detail
    return reply.status(200).send({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        isImported: user.isImported,
        provider: user.provider,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      athleteProfileId,
      observerProfileId,
      activePlan,
    })
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return reply.status(404).send({ message: 'Usuário não encontrado.' })
    }
    throw error
  }
}
