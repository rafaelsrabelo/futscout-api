import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaCompetitionRepository } from '../repositories/prisma/prisma-competition-repository.js'
import { CreateCompetitionUseCase } from '../use-cases/create-competition.js'

export async function createCompetition(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const createCompetitionBodySchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    start_date: z.string().transform((val) => new Date(val)).optional(),
    end_date: z.string().transform((val) => new Date(val)).optional(),
    location: z.string().optional(),
    modality: z.enum(['FUT_11', 'FUT_7', 'FUTSAL']).optional(),
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
    ]).optional(),
  })

  try {
    const {
      name,
      description,
      start_date: startDate,
      end_date: endDate,
      location,
      modality,
      category,
    } = createCompetitionBodySchema.parse(request.body)

    const competitionRepository = new PrismaCompetitionRepository()
    const athleteProfileRepository = new PrismaAthleteProfileRepository()
    const createCompetitionUseCase = new CreateCompetitionUseCase(
      competitionRepository,
      athleteProfileRepository,
    )

    const competition = await createCompetitionUseCase.execute({
      userId: request.user.sub,
      name,
      description: description || null,
      startDate: startDate || null,
      endDate: endDate || null,
      location: location || null,
      modality: modality || null,
      category: category || null,
    })

    return reply.status(201).send({ competition })
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === 'AthleteProfileNotFoundError'
    ) {
      return reply.status(404).send({
        message: error.message,
      })
    }

    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        message: 'Validation error',
        issues: error.format(),
      })
    }

    console.error('Error creating competition:', error)
    return reply.status(500).send({
      message: 'Erro interno do servidor.',
    })
  }
}

