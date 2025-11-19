import type { FastifyReply, FastifyRequest } from 'fastify'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaCompetitionRepository } from '../repositories/prisma/prisma-competition-repository.js'
import { ListMyCompetitionsUseCase } from '../use-cases/list-my-competitions.js'

export async function listMyCompetitions(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const competitionRepository = new PrismaCompetitionRepository()
    const athleteProfileRepository = new PrismaAthleteProfileRepository()
    const listMyCompetitionsUseCase = new ListMyCompetitionsUseCase(
      competitionRepository,
      athleteProfileRepository,
    )

    const competitions = await listMyCompetitionsUseCase.execute({
      userId: request.user.sub,
    })

    return reply.send({ competitions })
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === 'AthleteProfileNotFoundError'
    ) {
      return reply.status(404).send({
        message: error.message,
      })
    }

    console.error('Error listing competitions:', error)
    return reply.status(500).send({
      message: 'Erro interno do servidor.',
    })
  }
}

