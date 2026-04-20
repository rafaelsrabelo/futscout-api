import type { FastifyReply, FastifyRequest } from 'fastify'

import { PrismaUsersRepository } from '../../repositories/prisma/prisma-users-repository.js'

export async function verifyAdminSession(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const usersRepository = new PrismaUsersRepository()
  const user = await usersRepository.findById(request.user.sub)

  if (!user) {
    return reply.status(404).send({
      message: 'Usuário não encontrado.',
    })
  }

  return reply.status(200).send({
    userId: user.id,
    email: user.email,
    role: user.role,
  })
}
