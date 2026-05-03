import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaAthleteProfileRepository } from '../../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaMatchRepository } from '../../repositories/prisma/prisma-match-repository.js'
import {
  AthleteNotFoundError,
  MatchNotFoundError,
  UpdateMatchAdminUseCase,
} from '../../use-cases/admin/update-match.js'

const paramsSchema = z.object({
  id: z.uuid('ID inválido.'),
})

const bodySchema = z.object({
  athleteProfileId: z.string().uuid().optional(),
  myTeamId: z.string().uuid().optional(),
  adversaryTeam: z.string().min(1).optional(),
  date: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
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
  location: z.string().min(1).optional(),
  streamUrl: z.string().url().nullable().optional(),
  competitionId: z.string().uuid().nullable().optional(),
  status: z.enum(['SCHEDULED', 'LIVE', 'FINISHED', 'CANCELLED']).optional(),
  result: z.enum(['WIN', 'LOSS', 'DRAW', 'NOT_FINISHED']).optional(),
  myTeamScore: z.number().int().min(0).nullable().optional(),
  adversaryScore: z.number().int().min(0).nullable().optional(),
  playerPosition: z.enum(['STARTER', 'SUBSTITUTE']).nullable().optional(),
  observations: z.string().nullable().optional(),
  matchDuration: z.number().int().min(0).max(240).nullable().optional(),
  approximateTime: z.number().int().min(0).max(240).nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
  videoUrl: z.string().url().nullable().optional(),
  youtubeUrl: z.string().url().nullable().optional(),
  performanceRating: z.number().int().min(1).max(5).nullable().optional(),
})

export async function updateMatchAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = paramsSchema.parse(request.params)
  const body = bodySchema.parse(request.body)

  const useCase = new UpdateMatchAdminUseCase(
    new PrismaMatchRepository(),
    new PrismaAthleteProfileRepository(),
  )

  try {
    const match = await useCase.execute({
      matchId: id,
      ...body,
    })
    return reply.status(200).send(match)
  } catch (error) {
    if (error instanceof MatchNotFoundError) {
      return reply.status(404).send({ message: 'Partida não encontrada.' })
    }
    if (error instanceof AthleteNotFoundError) {
      return reply.status(404).send({ message: 'Atleta não encontrado.' })
    }
    throw error
  }
}
