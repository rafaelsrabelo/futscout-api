import type { FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { PrismaObserverProfileRepository } from '../repositories/prisma/prisma-observer-profile-repository.js'
import { GetObserverProfileUseCase } from '../use-cases/get-observer-profile.js'
import { ObserverProfileNotFoundError } from '../use-cases/errors/observer-profile-not-found-error.js'

function formatCpf(cpf: string | null): string | null {
  if (!cpf) return null
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export async function getObserverProfile(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const observerProfileRepository = new PrismaObserverProfileRepository()
    const getObserverProfileUseCase = new GetObserverProfileUseCase(
      observerProfileRepository,
    )

    const { observerProfile } = await getObserverProfileUseCase.execute({
      userId: request.user.sub,
    })

    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
      select: { cpf: true },
    })

    return reply.status(200).send({
      observerProfile: {
        ...observerProfile,
        cpf: formatCpf(user?.cpf ?? null),
      },
    })
  } catch (err) {
    if (err instanceof ObserverProfileNotFoundError) {
      return reply.status(404).send({ message: err.message })
    }

    throw err
  }
}
