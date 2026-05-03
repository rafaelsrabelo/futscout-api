import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaAthleteProfileRepository } from '../../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaRefreshTokenRepository } from '../../repositories/prisma/prisma-refresh-token-repository.js'
import { PrismaUsersRepository } from '../../repositories/prisma/prisma-users-repository.js'
import {
  AthleteNotFoundError,
  ResetAthletePasswordAdminUseCase,
} from '../../use-cases/admin/reset-athlete-password.js'

const paramsSchema = z.object({
  id: z.uuid('ID inválido.'),
})

const bodySchema = z.object({
  password: z.string().min(8).max(128),
})

export async function resetAthletePasswordAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = paramsSchema.parse(request.params)
  const { password } = bodySchema.parse(request.body)

  const useCase = new ResetAthletePasswordAdminUseCase(
    new PrismaAthleteProfileRepository(),
    new PrismaUsersRepository(),
    new PrismaRefreshTokenRepository(),
  )

  try {
    await useCase.execute({ athleteProfileId: id, newPassword: password })
    return reply.status(204).send()
  } catch (error) {
    if (error instanceof AthleteNotFoundError) {
      return reply.status(404).send({ message: 'Atleta não encontrado.' })
    }
    throw error
  }
}
