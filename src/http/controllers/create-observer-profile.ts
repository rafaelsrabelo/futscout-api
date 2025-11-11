import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaObserverProfileRepository } from '../repositories/prisma/prisma-observer-profile-repository.js'
import { CreateObserverProfileUseCase } from '../use-cases/create-observer-profile.js'
import { CpfAlreadyExistsError } from '../use-cases/errors/cpf-already-exists-error.js'

export async function createObserverProfile(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const createObserverProfileBodySchema = z.object({
    cpf: z.string(),
    name: z.string(),
    currentClub: z.string().optional(),
    phone: z.string(),
    profilePhoto: z.string().optional(),
  })

  const { cpf, name, currentClub, phone, profilePhoto } =
    createObserverProfileBodySchema.parse(request.body)

  try {
    const observerProfileRepository = new PrismaObserverProfileRepository()
    const createObserverProfileUseCase = new CreateObserverProfileUseCase(
      observerProfileRepository,
    )

    const { observerProfile } = await createObserverProfileUseCase.execute({
      userId: request.user.sub,
      cpf,
      name,
      currentClub,
      phone,
      profilePhoto,
    })

    return reply.status(201).send({
      observerProfile: {
        ...observerProfile,
        cpf: observerProfile.cpf.replace(
          /(\d{3})(\d{3})(\d{3})(\d{2})/,
          '$1.$2.$3-$4',
        ),
      },
    })
  } catch (err) {
    if (err instanceof CpfAlreadyExistsError) {
      return reply.status(409).send({ message: err.message })
    }

    throw err
  }
}
