import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { PrismaObserverProfileRepository } from '../repositories/prisma/prisma-observer-profile-repository.js'
import { CreateObserverProfileUseCase } from '../use-cases/create-observer-profile.js'

function formatCpf(cpf: string | null): string | null {
  if (!cpf) return null
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export async function createObserverProfile(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const createObserverProfileBodySchema = z.object({
    name: z.string(),
    currentClub: z.string().optional(),
    phone: z.string(),
    profilePhoto: z.string().optional(),
  })

  const { name, currentClub, phone, profilePhoto } =
    createObserverProfileBodySchema.parse(request.body)

  const observerProfileRepository = new PrismaObserverProfileRepository()
  const createObserverProfileUseCase = new CreateObserverProfileUseCase(
    observerProfileRepository,
  )

  const { observerProfile } = await createObserverProfileUseCase.execute({
    userId: request.user.sub,
    name,
    currentClub,
    phone,
    profilePhoto,
  })

  const user = await prisma.user.findUnique({
    where: { id: request.user.sub },
    select: { cpf: true },
  })

  return reply.status(201).send({
    observerProfile: {
      ...observerProfile,
      cpf: formatCpf(user?.cpf ?? null),
    },
  })
}
