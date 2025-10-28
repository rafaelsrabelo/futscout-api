import type { FastifyReply, FastifyRequest } from 'fastify'
import z from 'zod'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'

export async function getAthlete(request: FastifyRequest, reply: FastifyReply) {
  const getAthleteParamsSchema = z.object({
    id: z.string().uuid(),
  })

  const { id } = getAthleteParamsSchema.parse(request.params)

  try {
    const athleteProfileRepository = new PrismaAthleteProfileRepository()

    // Buscar o perfil do atleta pelo ID
    const athleteProfile = await athleteProfileRepository.findById(id)

    if (!athleteProfile) {
      return reply.status(404).send({ message: 'Athlete not found' })
    }

    return reply.status(200).send({
      athlete: athleteProfile,
    })
  } catch (error) {
    return reply.status(500).send({ message: 'Internal server error' })
  }
}
