import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { PrismaCompetitionRepository } from '../repositories/prisma/prisma-competition-repository.js'

export async function getCompetition(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const getCompetitionParamsSchema = z.object({
    id: z.string().uuid(),
  })

  try {
    const { id } = getCompetitionParamsSchema.parse(request.params)

    const competitionRepository = new PrismaCompetitionRepository()
    const competition = await competitionRepository.findById(id)

    if (!competition) {
      return reply.status(404).send({
        message: 'Competition not found',
      })
    }

    return reply.send({ competition })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        message: 'Validation error',
        issues: error.format(),
      })
    }

    console.error('Error getting competition:', error)
    return reply.status(500).send({
      message: 'Erro interno do servidor.',
    })
  }
}

