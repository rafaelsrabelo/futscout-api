import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaCompetitionRepository } from '../repositories/prisma/prisma-competition-repository.js'
import { UpdateCompetitionUseCase } from '../use-cases/update-competition.js'
import {
  CompetitionNotBelongsToAthleteError,
  CompetitionNotFoundError,
} from '../use-cases/update-competition.js'

export async function updateCompetition(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const updateCompetitionParamsSchema = z.object({
    id: z.string().uuid(),
  })

  const updateCompetitionBodySchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    start_date: z.string().transform((val) => new Date(val)).optional().nullable(),
    end_date: z.string().transform((val) => new Date(val)).optional().nullable(),
    location: z.string().optional().nullable(),
    modality: z.enum(['FUT_11', 'FUT_7', 'FUTSAL']).optional().nullable(),
    category: z.enum([
      'U5',
      'U6',
      'U7',
      'U8',
      'U9',
      'U10',
      'U11',
      'U12',
      'U13',
      'U14',
      'U15',
      'U16',
      'U17',
      'U18',
      'U19',
      'U20',
      'AMATEUR',
      'PROFESSIONAL',
    ]).optional().nullable(),
  })

  try {
    const { id } = updateCompetitionParamsSchema.parse(request.params)
    const {
      name,
      description,
      start_date: startDate,
      end_date: endDate,
      location,
      modality,
      category,
    } = updateCompetitionBodySchema.parse(request.body)

    const competitionRepository = new PrismaCompetitionRepository()
    const athleteProfileRepository = new PrismaAthleteProfileRepository()
    const updateCompetitionUseCase = new UpdateCompetitionUseCase(
      competitionRepository,
      athleteProfileRepository,
    )

    const competition = await updateCompetitionUseCase.execute({
      competitionId: id,
      userId: request.user.sub,
      name,
      description: description !== undefined ? description : undefined,
      startDate: startDate !== undefined ? startDate : undefined,
      endDate: endDate !== undefined ? endDate : undefined,
      location: location !== undefined ? location : undefined,
      modality: modality !== undefined ? modality : undefined,
      category: category !== undefined ? category : undefined,
    })

    return reply.send({ competition })
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

    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        message: 'Validation error',
        issues: error.format(),
      })
    }

    console.error('Error updating competition:', error)
    return reply.status(500).send({
      message: 'Erro interno do servidor.',
    })
  }
}

