import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { PrismaObserverProfileRepository } from '../repositories/prisma/prisma-observer-profile-repository.js'
import { UpdateObserverProfileUseCase } from '../use-cases/update-observer-profile.js'
import { CpfAlreadyExistsError } from '../use-cases/errors/cpf-already-exists-error.js'
import { ObserverProfileNotFoundError } from '../use-cases/errors/observer-profile-not-found-error.js'

export async function updateObserverProfile(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const updateObserverProfileBodySchema = z.object({
    cpf: z.string().optional(),
    name: z.string().optional(),
    currentClub: z.string().optional(),
    phone: z.string().optional(),
    profilePhoto: z.string().optional(),
  })

  const { cpf, name, currentClub, phone, profilePhoto } =
    updateObserverProfileBodySchema.parse(request.body)

  try {
    const observerProfileRepository = new PrismaObserverProfileRepository()
    const updateObserverProfileUseCase = new UpdateObserverProfileUseCase(
      observerProfileRepository,
    )

    const updateData = {
      userId: request.user.sub,
      ...(cpf !== undefined && { cpf }),
      ...(name !== undefined && { name }),
      ...(currentClub !== undefined && { currentClub }),
      ...(phone !== undefined && { phone }),
      ...(profilePhoto !== undefined && { profilePhoto }),
    }

    const { observerProfile } =
      await updateObserverProfileUseCase.execute(updateData)

    return reply.status(200).send({
      observerProfile: {
        ...observerProfile,
        cpf: observerProfile.cpf.replace(
          /(\d{3})(\d{3})(\d{3})(\d{2})/,
          '$1.$2.$3-$4',
        ),
      },
    })
  } catch (err) {
    if (err instanceof ObserverProfileNotFoundError) {
      return reply.status(404).send({ message: err.message })
    }

    if (err instanceof CpfAlreadyExistsError) {
      return reply.status(409).send({ message: err.message })
    }

    throw err
  }
}
