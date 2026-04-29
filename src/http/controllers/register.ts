import type { FastifyReply, FastifyRequest } from 'fastify'
import z from 'zod'
import { PrismaUsersRepository } from '../repositories/prisma/prisma-users-repository.js'
import { PrismaVerificationCodeRepository } from '../repositories/prisma/prisma-verification-code-repository.js'
import { CpfAlreadyExistsError } from '../use-cases/errors/cpf-already-exists-error.js'
import { EmailAlreadyExistsError } from '../use-cases/errors/email-already-exists-error.js'
import { InvalidCpfError } from '../use-cases/errors/invalid-cpf-error.js'
import { RegisterUseCase } from '../use-cases/register.js'

export async function register(request: FastifyRequest, reply: FastifyReply) {
  const registerBodySchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    cpf: z.string().min(11).max(14),
    role: z.enum(['ATHLETE', 'OBSERVER', 'ADMIN']).optional(),
  })
  const { name, email, password, cpf, role } = registerBodySchema.parse(
    request.body,
  )

  try {
    const prismaUsersRepository = new PrismaUsersRepository()
    const verificationCodeRepository = new PrismaVerificationCodeRepository()
    const registerUseCase = new RegisterUseCase(
      prismaUsersRepository,
      verificationCodeRepository,
    )
    const { user, reactivated } = await registerUseCase.execute({
      name,
      email,
      password,
      cpf,
      ...(role && { role }),
    })

    return reply.status(reactivated ? 200 : 201).send({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        role: user.role,
      },
      reactivated,
    })
  } catch (error) {
    if (error instanceof InvalidCpfError) {
      return reply.status(400).send({ message: error.message })
    }
    if (error instanceof CpfAlreadyExistsError) {
      return reply.status(409).send({ message: error.message })
    }
    if (error instanceof EmailAlreadyExistsError) {
      return reply.status(409).send({ message: error.message })
    }
    throw error
  }
}
