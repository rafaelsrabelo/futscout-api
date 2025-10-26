import { prisma } from '@/lib/prisma.js'
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
    return reply.status(400).send({ message: 'User already exists' })
  }

  await prisma.user.create({
    data: {
      name,
      email,
      password,
      role: role || 'ATHLETE',
    },
  })

  return reply.status(201).send()
}
