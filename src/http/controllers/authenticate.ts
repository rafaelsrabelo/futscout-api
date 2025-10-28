import z from 'zod'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { PrismaUsersRepository } from '../repositories/prisma/prisma-users-repository.js'
import { AuthenticateUseCase } from '../use-cases/authenticate.js'
import { InvalidCredentialsError } from '../use-cases/errors/invalid-credentials-error.js'

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const authenticateBodySchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  })
  const { email, password } = authenticateBodySchema.parse(request.body)

  try {
    const usersRepository = new PrismaUsersRepository()
    const authenticateUseCase = new AuthenticateUseCase(usersRepository)

    const { user } = await authenticateUseCase.execute({
      email,
      password,
    })

    const token = await reply.jwtSign({ role: user.role }, { sub: user.id })

    return reply.status(200).send({
      token,
    })
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return reply.status(401).send({ message: error.message })
    }

    throw error
  }
}
