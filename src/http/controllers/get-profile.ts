import type { FastifyReply, FastifyRequest } from 'fastify'
import { PrismaUsersRepository } from '../repositories/prisma/prisma-users-repository.js'
import { GetProfileUseCase } from '../use-cases/get-profile.js'

export async function getProfile(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user.sub

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
