import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaAddressRepository } from '../repositories/prisma/prisma-address-repository.js'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { CreateAddressUseCase } from '../use-cases/create-address.js'

export async function createAddress(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const createAddressBodySchema = z.object({
    zipCode: z.string().max(10),
    street: z.string().max(255),
    number: z.string().max(20),
    complement: z.string().max(100).optional(),
    district: z.string().max(100),
    city: z.string().max(100),
    state: z.string().max(100),
    country: z.string().max(100),
  })

  const userId = request.user.sub
  const data = createAddressBodySchema.parse(request.body)

  try {
    const addressRepository = new PrismaAddressRepository()
    const athleteProfileRepository = new PrismaAthleteProfileRepository()
    const createAddressUseCase = new CreateAddressUseCase(
      addressRepository,
      athleteProfileRepository,
    )

    // Handle optional complement property for exactOptionalPropertyTypes compliance
    const { complement, ...requiredData } = data
    const addressRequest = {
      userId,
      ...requiredData,
      ...(complement !== undefined && { complement }),
    }

    const { address } = await createAddressUseCase.execute(addressRequest)

    return reply.status(201).send({ address })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Athlete profile not found') {
        return reply.status(404).send({ message: 'Athlete profile not found' })
      }
      if (error.message === 'Address already exists for this athlete') {
        return reply.status(409).send({ message: 'Address already exists' })
      }
    }

    return reply.status(500).send({ message: 'Internal server error' })
  }
}
