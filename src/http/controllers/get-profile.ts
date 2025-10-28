import type { FastifyReply, FastifyRequest } from 'fastify'
import { PrismaUsersRepository } from '../repositories/prisma/prisma-users-repository.js'
import { GetProfileUseCase } from '../use-cases/get-profile.js'

export async function getProfile(request: FastifyRequest, reply: FastifyReply) {
  // TODO: Implementar autenticação JWT middleware
  // Por enquanto, vamos assumir que o userId vem como parâmetro ou header
  const userId = request.headers['user-id'] as string

  if (!userId) {
    return reply.status(401).send({ message: 'User ID required' })
  }

  try {
    const prismaUsersRepository = new PrismaUsersRepository()
    const getProfileUseCase = new GetProfileUseCase(prismaUsersRepository)

    const { user } = await getProfileUseCase.execute({ userId })

    return reply.status(200).send({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isProfile: user.isProfile,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    return reply.status(404).send({ message: 'User not found' })
  }
}
