import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaAddressRepository } from '../repositories/prisma/prisma-address-repository.js'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { UpdateAddressUseCase } from '../use-cases/update-address.js'

export async function updateAddress(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const updateAddressBodySchema = z.object({
    zipCode: z.string().max(10).optional(),
    street: z.string().max(255).optional(),
    number: z.string().max(20).optional(),
    complement: z.string().max(100).optional(),
    district: z.string().max(100).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
  })

  const userId = request.user.sub
  const data = updateAddressBodySchema.parse(request.body)

  try {
    const addressRepository = new PrismaAddressRepository()
    const athleteProfileRepository = new PrismaAthleteProfileRepository()
    const updateAddressUseCase = new UpdateAddressUseCase(
      addressRepository,
      athleteProfileRepository,
    )

    // Filtrar propriedades undefined
    const updateData: {
      userId: string
      zipCode?: string
      street?: string
      number?: string
      complement?: string
      district?: string
      city?: string
      state?: string
      country?: string
    } = { userId }
    if (data.zipCode !== undefined) updateData.zipCode = data.zipCode
    if (data.street !== undefined) updateData.street = data.street
    if (data.number !== undefined) updateData.number = data.number
    if (data.complement !== undefined) updateData.complement = data.complement
    if (data.district !== undefined) updateData.district = data.district
    if (data.city !== undefined) updateData.city = data.city
    if (data.state !== undefined) updateData.state = data.state
    if (data.country !== undefined) updateData.country = data.country

    const { address } = await updateAddressUseCase.execute(updateData)

    return reply.status(200).send({ address })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Athlete profile not found') {
        return reply.status(404).send({ message: 'Athlete profile not found' })
      }
      if (error.message === 'Address not found for this athlete') {
        return reply.status(404).send({ message: 'Address not found' })
      }
    }

    return reply.status(500).send({ message: 'Internal server error' })
  }
}
