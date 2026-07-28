import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { PrismaObserverProfileRepository } from '../repositories/prisma/prisma-observer-profile-repository.js'
import { ObserverProfileNotFoundError } from '../use-cases/errors/observer-profile-not-found-error.js'
import { UpdateObserverProfileUseCase } from '../use-cases/update-observer-profile.js'

function formatCpf(cpf: string | null): string | null {
  if (!cpf) return null
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export async function updateObserverProfile(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const updateObserverProfileBodySchema = z.object({
    name: z.string().optional(),
    currentClub: z.string().optional(),
    phone: z.string().optional(),
    profilePhoto: z.string().optional(),
  })

  const { name, currentClub, phone, profilePhoto } =
    updateObserverProfileBodySchema.parse(request.body)

  try {
    const observerProfileRepository = new PrismaObserverProfileRepository()
    const updateObserverProfileUseCase = new UpdateObserverProfileUseCase(
      observerProfileRepository,
    )

    const updateData = {
      userId: request.user.sub,
      ...(name !== undefined && { name }),
      ...(currentClub !== undefined && { currentClub }),
      ...(phone !== undefined && { phone }),
      ...(profilePhoto !== undefined && { profilePhoto }),
    }

    const { observerProfile } =
      await updateObserverProfileUseCase.execute(updateData)

    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
      select: { name: true, cpf: true },
    })

    return reply.status(200).send({
      observerProfile: {
        ...observerProfile,
        name: user?.name ?? null,
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
