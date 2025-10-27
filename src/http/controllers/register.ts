import type { FastifyReply, FastifyRequest } from 'fastify'
import z from 'zod'
import { PrismaUsersRepository } from '../repositories/prisma-users-repository.js'
import { RegisterUseCae } from '../use-cases/register.js'

export async function register(request: FastifyRequest, reply: FastifyReply) {
  const registerBodySchema = z.object({
    name: z.string(),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['ATHLETE', 'OBSERVER', 'ADMIN']).optional(),
  })
  const { name, email, password, role } = registerBodySchema.parse(request.body)

  try {
    const prismaUsersRepository = new PrismaUsersRepository()
    const registerUseCase = new RegisterUseCae(prismaUsersRepository)
    await registerUseCase.execute({
      name,
      email,
      password,
      role: role || 'ATHLETE',
    })
  } catch (error) {
    return reply.status(409).send()
  }

  return reply.status(201).send()
}
