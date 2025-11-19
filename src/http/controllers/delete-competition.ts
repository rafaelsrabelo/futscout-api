import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaCompetitionRepository } from '../repositories/prisma/prisma-competition-repository.js'
import { DeleteCompetitionUseCase } from '../use-cases/delete-competition.js'
import {
  CompetitionNotBelongsToAthleteError,
  CompetitionNotFoundError,
} from '../use-cases/delete-competition.js'

export async function deleteCompetition(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const deleteCompetitionParamsSchema = z.object({
    id: z.string().uuid(),
  })

  try {
    const { id } = deleteCompetitionParamsSchema.parse(request.params)

    const competitionRepository = new PrismaCompetitionRepository()
    const athleteProfileRepository = new PrismaAthleteProfileRepository()
    const deleteCompetitionUseCase = new DeleteCompetitionUseCase(
      competitionRepository,
      athleteProfileRepository,
    )

    await deleteCompetitionUseCase.execute({
      competitionId: id,
      userId: request.user.sub,
    })

    return reply.status(204).send()
  } catch (error) {
    if (error instanceof CompetitionNotFoundError) {
      return reply.status(404).send({
        message: error.message,
      })
    }

    if (error instanceof CompetitionNotBelongsToAthleteError) {
      return reply.status(403).send({
        message: error.message,
      })
    }

    console.error('Error deleting competition:', error)
    return reply.status(500).send({
      message: 'Erro interno do servidor.',
    })
  }
}

