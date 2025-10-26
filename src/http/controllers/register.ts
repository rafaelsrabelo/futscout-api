import { prisma } from '@/lib/prisma.js'
import { hash } from 'bcryptjs'
import type { FastifyReply, FastifyRequest } from 'fastify'
import z from 'zod'

export async function register(request: FastifyRequest, reply: FastifyReply) {
  const registerBodySchema = z.object({
    name: z.string(),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['ATHLETE', 'OBSERVER', 'ADMIN']).optional(),
  })
  const { name, email, password, role } = registerBodySchema.parse(request.body)

  const userWithSameEmail = await prisma.user.findUnique({
    where: { email },
  })

  if (userWithSameEmail) {
    return reply.status(409).send({ message: 'User already exists' })
  }

  const password_hash = await hash(password, 6)

  await prisma.user.create({
    data: {
      name,
      email,
      password: password_hash,
      role: role || 'ATHLETE',
    },
  })

  return reply.status(201).send()
}
