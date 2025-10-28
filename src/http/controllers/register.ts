import type { FastifyReply, FastifyRequest } from 'fastify'
import z from 'zod'
import { PrismaUsersRepository } from '../repositories/prisma/prisma-users-repository.js'
import { PrismaVerificationCodeRepository } from '../repositories/prisma/prisma-verification-code-repository.js'
import { RegisterUseCase } from '../use-cases/register.js'
import { EmailAlreadyExistsError } from '../use-cases/errors/email-already-exists-error.js'

export async function register(request: FastifyRequest, reply: FastifyReply) {
  const registerBodySchema = z.object({
    name: z.string(),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['ATHLETE', 'OBSERVER', 'ADMIN']),
  })
  const { name, email, password, role } = registerBodySchema.parse(request.body)

  try {
    const prismaUsersRepository = new PrismaUsersRepository()
    const verificationCodeRepository = new PrismaVerificationCodeRepository()
    const registerUseCase = new RegisterUseCase(
      prismaUsersRepository,
      verificationCodeRepository,
    )
    const { user } = await registerUseCase.execute({
      name,
      email,
      password,
      role,
    })

    return reply.status(201).send({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        password: user.password,
      },
    })
  } catch (error) {
    if (error instanceof EmailAlreadyExistsError) {
      return reply.status(409).send({ message: error.message })
    }
    throw error
  }
}
