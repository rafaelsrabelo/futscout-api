import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaAthleteProfileRepository } from '../../repositories/prisma/prisma-athlete-profile-repository.js'
import { AthleteNotFoundError } from '../../use-cases/admin/errors/athlete-not-found-error.js'
import { GetAthleteAdminUseCase } from '../../use-cases/admin/get-athlete.js'

const getAthleteAdminParamsSchema = z.object({
  id: z.uuid('ID inválido.'),
})

export async function getAthleteAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = getAthleteAdminParamsSchema.parse(request.params)

  const athleteProfileRepository = new PrismaAthleteProfileRepository()
  const getAthleteAdminUseCase = new GetAthleteAdminUseCase(
    athleteProfileRepository,
  )

  try {
    const result = await getAthleteAdminUseCase.execute({
      athleteProfileId: id,
    })

    return reply.status(200).send(result)
  } catch (error) {
    if (error instanceof AthleteNotFoundError) {
      return reply.status(404).send({ message: 'Atleta não encontrado.' })
    }

    throw error
  }
}
