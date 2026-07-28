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
  // `name` não entra aqui: o nome é definido no cadastro (POST /auth/register).
  // Versões antigas do mobile ainda podem mandá-lo — o Zod descarta em silêncio.
  const createObserverProfileBodySchema = z.object({
    currentClub: z.string().optional(),
    phone: z.string(),
    profilePhoto: z.string().optional(),
  })

  const { currentClub, phone, profilePhoto } =
    createObserverProfileBodySchema.parse(request.body)

  const observerProfileRepository = new PrismaObserverProfileRepository()
  const createObserverProfileUseCase = new CreateObserverProfileUseCase(
    observerProfileRepository,
  )

  const { observerProfile } = await createObserverProfileUseCase.execute({
    userId: request.user.sub,
    currentClub,
    phone,
    profilePhoto,
  })

  const user = await prisma.user.findUnique({
    where: { id: request.user.sub },
    select: { name: true, cpf: true },
  })

  return reply.status(201).send({
    observerProfile: {
      ...observerProfile,
      name: user?.name ?? null,
      cpf: formatCpf(user?.cpf ?? null),
    },
  })
}
