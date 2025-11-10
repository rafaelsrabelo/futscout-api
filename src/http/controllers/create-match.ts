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
    myTeamId: z.string().uuid(),
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
    status: z.enum(['SCHEDULED', 'LIVE', 'FINISHED', 'CANCELLED']).optional(),
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
    myTeamId,
    adversaryTeam,
    date,
    modality,
    category,
    location,
    streamUrl,
    status,
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

  // Lógica inteligente para status baseado na data
  const now = new Date()
  let intelligentStatus = status || 'SCHEDULED'
  let intelligentResult = result || 'NOT_FINISHED'

  // Se a data é anterior a hoje, provavelmente é uma partida já finalizada
  if (date < now && !status) {
    intelligentStatus = 'FINISHED'

    // Se tem placar definido, mas não tem resultado definido, usar NOT_FINISHED
    // para que a lógica automática do use case calcule baseado no placar
    if (
      (myTeamScore !== undefined || adversaryScore !== undefined) &&
      !result
    ) {
      intelligentResult = 'NOT_FINISHED' // Será recalculado automaticamente
    }
  }

  const match = await createMatchUseCase.execute({
    athleteId: request.user.sub,
    myTeamId,
    adversaryTeam,
    date,
    modality,
    category,
    location,
    streamUrl: streamUrl || null,
    status: intelligentStatus,
    result: intelligentResult,
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
