import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaCompetitionRepository } from '../repositories/prisma/prisma-competition-repository.js'
import { PrismaMatchRepository } from '../repositories/prisma/prisma-match-repository.js'
import { CreateMatchUseCase } from '../use-cases/create-match.js'

export async function createMatch(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const createMatchBodySchema = z.object({
    myTeamId: z.string().uuid(),
    adversaryTeam: z.string(),
    date: z.string().transform((val) => new Date(val)),
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
    location: z.string().optional(),
    streamUrl: z.string().optional(),
    competition_id: z.string().uuid().optional(), // Se não fornecido, é amistoso
    status: z.enum(['SCHEDULED', 'LIVE', 'FINISHED', 'CANCELLED']).optional(),
    result: z.enum(['WIN', 'LOSS', 'DRAW', 'NOT_FINISHED']).optional(),
    myTeamScore: z.number().int().min(0).optional(),
    adversaryScore: z.number().int().min(0).optional(),
    playerPosition: z.enum(['STARTER', 'SUBSTITUTE']).optional(), // Pode ser definido ao finalizar
    observations: z.string().optional(),
    matchDuration: z.number().int().min(0).max(240).optional(), // duração total da partida
    approximateTime: z.number().int().min(0).max(240).optional(), // tempo jogado pelo atleta
    photoUrl: z.string().url().optional(),
    videoUrl: z.string().url().optional(),
    youtubeUrl: z.string().url().optional(), // link do YouTube
    performanceRating: z.number().int().min(1).max(5).optional(),
  })

  const parsed = createMatchBodySchema.parse(request.body)
  const {
    myTeamId,
    adversaryTeam,
    date,
    modality,
    category,
    location,
    streamUrl,
    competition_id: competitionId,
    status,
    result,
    myTeamScore,
    adversaryScore,
    playerPosition,
    observations,
    matchDuration,
    approximateTime,
    photoUrl,
    videoUrl,
    youtubeUrl,
    performanceRating,
  } = parsed

  // Se não houver competition_id, modality, category e location são obrigatórios
  if (!competitionId) {
    if (!modality) {
      return reply.status(400).send({
        message: 'modality is required when competition_id is not provided',
      })
    }
    if (!category) {
      return reply.status(400).send({
        message: 'category is required when competition_id is not provided',
      })
    }
    if (!location) {
      return reply.status(400).send({
        message: 'location is required when competition_id is not provided',
      })
    }
  }

  const matchRepository = new PrismaMatchRepository()
  const athleteProfileRepository = new PrismaAthleteProfileRepository()
  const competitionRepository = new PrismaCompetitionRepository()
  const createMatchUseCase = new CreateMatchUseCase(
    matchRepository,
    athleteProfileRepository,
    competitionRepository,
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
    modality: modality || undefined,
    category: category || undefined,
    location: location || undefined,
    streamUrl: streamUrl || null,
    competitionId: competitionId || null,
    status: intelligentStatus,
    result: intelligentResult,
    myTeamScore: myTeamScore || null,
    adversaryScore: adversaryScore || null,
    playerPosition: playerPosition || null,
    observations: observations || null,
    matchDuration: matchDuration || null,
    approximateTime: approximateTime || null,
    photoUrl: photoUrl || null,
    videoUrl: videoUrl || null,
    youtubeUrl: youtubeUrl || null,
    performanceRating: performanceRating || null,
  })

  return reply.status(201).send({ match })
}
