import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { UpdateMatchUseCase } from '../use-cases/update-match.js'
import { PrismaMatchRepository } from '../repositories/prisma/prisma-match-repository.js'
import { PrismaScoutRepository } from '../repositories/prisma/prisma-scout-repository.js'
import { PrismaPlayRepository } from '../repositories/prisma/prisma-play-repository.js'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'

export async function updateMatch(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const updateMatchParamsSchema = z.object({
    id: z.string().uuid(),
  })

  const updateMatchBodySchema = z.object({
    myTeam: z.string().optional(),
    adversaryTeam: z.string().optional(),
    date: z
      .string()
      .transform((val) => new Date(val))
      .optional(),
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
    streamUrl: z.string().optional(),
    status: z.enum(['SCHEDULED', 'LIVE', 'FINISHED', 'CANCELLED']).optional(),
    result: z.enum(['WIN', 'LOSS', 'DRAW', 'NOT_FINISHED']).optional(),
    myTeamScore: z.number().int().min(0).optional(),
    adversaryScore: z.number().int().min(0).optional(),
    playerPosition: z.enum(['STARTER', 'SUBSTITUTE']).optional(),
    observations: z.string().optional(),
    matchDuration: z.number().int().min(0).max(240).optional(), // duração total da partida
    approximateTime: z.number().int().min(0).max(240).optional(), // tempo jogado pelo atleta
    photoUrl: z.string().url().optional(),
    videoUrl: z.string().url().optional(),
    performanceRating: z.number().int().min(1).max(5).optional(),
  })

  const { id } = updateMatchParamsSchema.parse(request.params)
  const parsedData = updateMatchBodySchema.parse(request.body)

  // Filter out undefined values to match Prisma's MatchUpdateInput type
  const updateData = Object.fromEntries(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    Object.entries(parsedData).filter(([_, value]) => value !== undefined),
  )

  const matchRepository = new PrismaMatchRepository()
  const scoutRepository = new PrismaScoutRepository()
  const playRepository = new PrismaPlayRepository()
  const athleteProfileRepository = new PrismaAthleteProfileRepository()
  const updateMatchUseCase = new UpdateMatchUseCase(
    matchRepository,
    athleteProfileRepository,
    scoutRepository,
    playRepository,
  )

  const match = await updateMatchUseCase.execute({
    matchId: id,
    userId: request.user.sub,
    updateData,
  })

  return reply.send({ match })
}
