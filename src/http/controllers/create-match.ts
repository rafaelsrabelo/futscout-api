import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaCompetitionRepository } from '../repositories/prisma/prisma-competition-repository.js'
import { PrismaMatchRepository } from '../repositories/prisma/prisma-match-repository.js'
import { PrismaTeamRepository } from '../repositories/prisma/prisma-team-repository.js'
import { CreateCompetitionUseCase } from '../use-cases/create-competition.js'
import { CreateMatchUseCase } from '../use-cases/create-match.js'
import { incrementMatchUsage } from '../utils/increment-usage.js'
import { notifyFavoritesInBackground } from '../utils/notify-favorites.js'

export async function createMatch(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const createMatchBodySchema = z.object({
    // Time: pode ser ID existente ou objeto para criar inline
    myTeamId: z.string().uuid().optional(),
    myTeam: z
      .object({
        name: z.string().min(1).max(100),
        acronym: z.string().min(1).max(10).optional(),
        shieldPhoto: z.string().url().optional(),
        isPrincipal: z.boolean().optional().default(false),
      })
      .optional(),
    adversaryTeam: z.string(),
    date: z.string().transform((val) => new Date(val)),
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
    // Competição: pode ser ID existente ou objeto para criar inline (apenas nome obrigatório)
    competition_id: z.string().uuid().optional(),
    competition: z
      .object({
        name: z.string().min(1), // Apenas nome obrigatório para criar inline
        description: z.string().optional(),
        start_date: z.string().transform((val) => new Date(val)).optional(),
        end_date: z.string().transform((val) => new Date(val)).optional(),
        location: z.string().optional(),
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
      })
      .optional(),
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

  let parsed: z.infer<typeof createMatchBodySchema>
  try {
    parsed = createMatchBodySchema.parse(request.body)
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        message: 'Validation error',
        issues: error.format(),
        details: error.errors,
      })
    }
    throw error
  }
  const {
    myTeamId,
    myTeam,
    adversaryTeam,
    date,
    modality,
    category,
    location,
    streamUrl,
    competition_id: competitionId,
    competition,
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

  // Validar que myTeamId OU myTeam foi fornecido (mas não ambos)
  if (!myTeamId && !myTeam) {
    return reply.status(400).send({
      message: 'Either myTeamId or myTeam object is required',
    })
  }

  if (myTeamId && myTeam) {
    return reply.status(400).send({
      message: 'Cannot provide both myTeamId and myTeam. Use one or the other.',
    })
  }

  // Validar que competition_id OU competition foi fornecido (mas não ambos, se fornecido)
  if (competitionId && competition) {
    return reply.status(400).send({
      message:
        'Cannot provide both competition_id and competition. Use one or the other.',
    })
  }

  // Se não houver competition_id nem competition, modality, category e location são obrigatórios
  if (!competitionId && !competition) {
    if (!modality) {
      return reply.status(400).send({
        message:
          'modality is required when competition_id or competition is not provided',
      })
    }
    if (!category) {
      return reply.status(400).send({
        message:
          'category is required when competition_id or competition is not provided',
      })
    }
    if (!location) {
      return reply.status(400).send({
        message:
          'location is required when competition_id or competition is not provided',
      })
    }
  }

  const matchRepository = new PrismaMatchRepository()
  const athleteProfileRepository = new PrismaAthleteProfileRepository()
  const competitionRepository = new PrismaCompetitionRepository()
  const teamRepository = new PrismaTeamRepository()

  // Criar competição inline se necessário
  let finalCompetitionId = competitionId || null
  if (competition && !competitionId) {
    const createCompetitionUseCase = new CreateCompetitionUseCase(
      competitionRepository,
      athleteProfileRepository,
    )
    const newCompetition = await createCompetitionUseCase.execute({
      userId: request.user.sub,
      name: competition.name,
      description: competition.description || null,
      startDate: competition.start_date || null,
      endDate: competition.end_date || null,
      location: competition.location || null,
      modality: competition.modality || null,
      category: competition.category || null,
    })
    finalCompetitionId = newCompetition.id
  }

  // Criar time inline se necessário
  let finalMyTeamId = myTeamId || null
  if (myTeam && !myTeamId) {
    // Verificar se já existe um time com o mesmo nome para este usuário
    const existingTeam = await teamRepository.findByName(
      myTeam.name,
      request.user.sub,
    )

    if (existingTeam) {
      // Se já existe, usar o existente
      finalMyTeamId = existingTeam.id
    } else {
      // Se não existe, criar novo
      // Se estiver marcando como principal, desmarcar outros times principais
      if (myTeam.isPrincipal) {
        await teamRepository.unsetPrincipalTeams(request.user.sub)
      }

      const newTeam = await teamRepository.create({
        name: myTeam.name,
        acronym: myTeam.acronym || null,
        shieldPhoto: myTeam.shieldPhoto || null,
        isPrincipal: myTeam.isPrincipal || false,
        userId: request.user.sub,
      })
      finalMyTeamId = newTeam.id

      // Se está criando como principal, atualizar o currentClub do perfil do atleta
      if (myTeam.isPrincipal) {
        try {
          await athleteProfileRepository.update(request.user.sub, {
            currentClub: newTeam.name,
          })
        } catch (error) {
          console.warn(
            'Failed to update currentClub in athlete profile:',
            error,
          )
        }
      }
    }
  }

  if (!finalMyTeamId) {
    return reply.status(400).send({
      message: 'Could not resolve myTeamId. Please provide a valid myTeamId or myTeam object.',
    })
  }

  const athleteProfile = await athleteProfileRepository.findByUserId(
    request.user.sub,
  )

  if (!athleteProfile) {
    return reply.status(400).send({
      message:
        'Athlete profile not found. Please create your athlete profile first.',
    })
  }

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
    athleteProfileId: athleteProfile.id,
    myTeamId: finalMyTeamId,
    adversaryTeam,
    date,
    modality: modality || undefined,
    category: category || undefined,
    location: location || undefined,
    streamUrl: streamUrl || null,
    competitionId: finalCompetitionId,
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

  // Incrementar contador de uso de partidas
  await incrementMatchUsage(request.user.sub)

  // Avisa quem favoritou este atleta. Não aguardado de propósito: notificação
  // não pode atrasar nem derrubar o cadastro da partida.
  notifyFavoritesInBackground(athleteProfile.id, 'FAVORITE_MATCH')

  return reply.status(201).send({ match })
}
