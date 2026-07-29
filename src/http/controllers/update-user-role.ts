import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { env } from '@/env/index.js'
import { PrismaUsersRepository } from '../repositories/prisma/prisma-users-repository.js'
import { UpdateUserRoleUseCase } from '../use-cases/update-user-role.js'

export async function updateUserRole(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const updateUserRoleBodySchema = z.object({
    role: z.enum(['ATHLETE', 'OBSERVER']),
  })

  const { role } = updateUserRoleBodySchema.parse(request.body)
  const userId = request.user.sub

  try {
    const usersRepository = new PrismaUsersRepository()
    const updateUserRoleUseCase = new UpdateUserRoleUseCase(usersRepository)

    const { user } = await updateUserRoleUseCase.execute({
      userId,
      role,
    })

    // O role vive DENTRO do access token, e o token atual foi assinado antes
    // desta escolha — no cadastro o usuário ainda não tinha role, então ele
    // carrega `role: null`. Sem devolver um token novo, o usuário vira
    // OBSERVER no banco e continua levando 403 em toda rota de observador até
    // o access token expirar e ser renovado.
    const accessToken = await reply.jwtSign(
      { role: user.role },
      {
        sub: user.id,
        expiresIn: env.JWT_EXPIRES_IN,
      },
    )

    return reply.status(200).send({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isProfile: user.isProfile,
      },
      // O app precisa substituir o token guardado por este.
      accessToken,
    })
  } catch (error) {
    console.error('❌ Error updating user role:', error)
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        return reply.status(404).send({ message: 'User not found' })
      }
      if (error.message === 'Role already defined') {
        return reply.status(400).send({
          message: 'User role is already defined and cannot be changed',
        })
      }
    }

    return reply.status(500).send({ message: 'Internal server error' })
  }
}
