import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaAthleteProfileRepository } from '../../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaCompetitionRepository } from '../../repositories/prisma/prisma-competition-repository.js'
import { PrismaMatchRepository } from '../../repositories/prisma/prisma-match-repository.js'
import {
  AthleteProfileNotFoundError,
  CreateMatchUseCase,
} from '../../use-cases/create-match.js'

const bodySchema = z.object({
  athleteProfileId: z.string().uuid(),
  myTeamId: z.string().uuid(),
  adversaryTeam: z.string().min(1),
  date: z.string().transform((v) => new Date(v)),
  modality: z.enum(['FUT_11', 'FUT_7', 'FUTSAL']).optional(),
  category: z
    .enum([
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
    ])
    .optional(),
  location: z.string().optional(),
  streamUrl: z.string().url().optional(),
  competitionId: z.string().uuid().optional(),
  status: z.enum(['SCHEDULED', 'LIVE', 'FINISHED', 'CANCELLED']).optional(),
  result: z.enum(['WIN', 'LOSS', 'DRAW', 'NOT_FINISHED']).optional(),
  myTeamScore: z.number().int().min(0).optional(),
  adversaryScore: z.number().int().min(0).optional(),
  playerPosition: z.enum(['STARTER', 'SUBSTITUTE']).optional(),
  observations: z.string().optional(),
  matchDuration: z.number().int().min(0).max(240).optional(),
  approximateTime: z.number().int().min(0).max(240).optional(),
  photoUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  youtubeUrl: z.string().url().optional(),
  performanceRating: z.number().int().min(1).max(5).optional(),
})

export async function createMatchAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = bodySchema.parse(request.body)

  const matchRepository = new PrismaMatchRepository()
  const athleteProfileRepository = new PrismaAthleteProfileRepository()
  const competitionRepository = new PrismaCompetitionRepository()

  const useCase = new CreateMatchUseCase(
    matchRepository,
    athleteProfileRepository,
    competitionRepository,
  )

  try {
    const match = await useCase.execute({
      athleteProfileId: body.athleteProfileId,
      myTeamId: body.myTeamId,
      adversaryTeam: body.adversaryTeam,
      date: body.date,
      modality: body.modality,
      category: body.category,
      location: body.location,
      streamUrl: body.streamUrl ?? null,
      competitionId: body.competitionId ?? null,
      status: body.status,
      result: body.result,
      myTeamScore: body.myTeamScore ?? null,
      adversaryScore: body.adversaryScore ?? null,
      playerPosition: body.playerPosition ?? null,
      observations: body.observations ?? null,
      matchDuration: body.matchDuration ?? null,
      approximateTime: body.approximateTime ?? null,
      photoUrl: body.photoUrl ?? null,
      videoUrl: body.videoUrl ?? null,
      youtubeUrl: body.youtubeUrl ?? null,
      performanceRating: body.performanceRating ?? null,
    })

    return reply.status(201).send(match)
  } catch (error) {
    if (error instanceof AthleteProfileNotFoundError) {
      return reply.status(404).send({ message: 'Atleta não encontrado.' })
    }
    throw error
  }
}
