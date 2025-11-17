import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
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

  console.log('🔧 Update Role - userId:', userId)
  console.log('🔧 Update Role - role:', role)

  try {
    const usersRepository = new PrismaUsersRepository()
    const updateUserRoleUseCase = new UpdateUserRoleUseCase(usersRepository)

    const { user } = await updateUserRoleUseCase.execute({
      userId,
      role,
    })

    return reply.status(200).send({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isProfile: user.isProfile,
      },
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
