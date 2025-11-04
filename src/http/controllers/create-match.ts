import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { CreateMatchUseCase } from '../use-cases/create-match.js'
import { PrismaMatchRepository } from '../repositories/prisma/prisma-match-repository.js'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'

export async function createMatch(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const createMatchBodySchema = z.object({
    myTeam: z.string(),
    adversaryTeam: z.string(),
    date: z.string().transform((val) => new Date(val)),
    modality: z.enum(['FUT_11', 'FUT_7', 'FUTSAL']),
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
    ]),
    location: z.string(),
    streamUrl: z.string().optional(),
    result: z.enum(['WIN', 'LOSS', 'DRAW', 'NOT_FINISHED']).optional(),
    myTeamScore: z.number().int().min(0).optional(),
    adversaryScore: z.number().int().min(0).optional(),
    playerPosition: z.enum(['STARTER', 'SUBSTITUTE']),
    observations: z.string().optional(),
    approximateTime: z.number().int().min(0).max(120).optional(),
    photoUrl: z.string().url().optional(),
    videoUrl: z.string().url().optional(),
    performanceRating: z.number().int().min(1).max(5).optional(),
  })

  const {
    myTeam,
    adversaryTeam,
    date,
    modality,
    category,
    location,
    streamUrl,
    result,
    myTeamScore,
    adversaryScore,
    playerPosition,
    observations,
    approximateTime,
    photoUrl,
    videoUrl,
    performanceRating,
  } = createMatchBodySchema.parse(request.body)

  const matchRepository = new PrismaMatchRepository()
  const athleteProfileRepository = new PrismaAthleteProfileRepository()
  const createMatchUseCase = new CreateMatchUseCase(
    matchRepository,
    athleteProfileRepository,
  )

  const match = await createMatchUseCase.execute({
    athleteId: request.user.sub,
    myTeam,
    adversaryTeam,
    date,
    modality,
    category,
    location,
    streamUrl: streamUrl || null,
    result: result || 'NOT_FINISHED',
    myTeamScore: myTeamScore || null,
    adversaryScore: adversaryScore || null,
    playerPosition,
    observations: observations || null,
    approximateTime: approximateTime || null,
    photoUrl: photoUrl || null,
    videoUrl: videoUrl || null,
    performanceRating: performanceRating || null,
  })

  return reply.status(201).send({ match })
}
