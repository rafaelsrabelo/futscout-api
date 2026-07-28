import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaMatchRepository } from '../repositories/prisma/prisma-match-repository.js'
import { PrismaPlayRepository } from '../repositories/prisma/prisma-play-repository.js'
import { AddPlayToMatchUseCase } from '../use-cases/add-play-to-match.js'
import { incrementVideoUsage } from '../utils/increment-usage.js'
import { notifyFavoritesInBackground } from '../utils/notify-favorites.js'

export async function addPlay(request: FastifyRequest, reply: FastifyReply) {
  const addPlayParamsSchema = z.object({
    id: z.string().uuid(),
  })

  const addPlayBodySchema = z.object({
    play_type: z.enum([
      'GOAL',
      'DIFFICULT_SAVE',
      'EASY_SAVE',
      'ASSIST',
      'FOUL_COMMITTED',
      'FOUL_RECEIVED',
      'DRIBBLE',
      'ANTICIPATION',
      'LONG_PASS',
      'FREE_KICK',
      'YELLOW_CARD',
      'RED_CARD',
      'RIGHT_FOOT_SHOT',
      'LEFT_FOOT_SHOT',
      'HEADER',
      'TACKLE',
      'INTERCEPTION',
      'CROSS',
      'CORNER_KICK',
      'PENALTY',
      'PASS',
      'KEY_PASS',
      'PENALTY_SAVE',
      'ONE_ON_ONE_SAVE',
      'REFLEX_SAVE',
      'DIVING_SAVE',
      'CATCH',
      'PUNCH',
      'DISTRIBUTION',
      'GOAL_KICK',
      'THROW_OUT',
      'SHOT_BLOCKED',
      'CLEARANCE',
      'OFFENSIVE_FOUL',
      'DEFENSIVE_FOUL',
      'BALL_RECOVERY',
      'THROUGH_PASS',
      'BACKHEEL',
      'VOLLLEY',
      'BICYCLE_KICK',
      'OFFSIDE',
      'MISSED_SHOT',
      'SHOT_ON_TARGET',
      'SHOT_OFF_TARGET',
      'BEST_MOMENTS',
    ]),
    video_url: z.string().url().optional(),
    photo_url: z.string().url().optional(),
    rating: z.number().int().min(1).max(5).optional(),
    observations: z.string().optional(),
    classifications: z
      .array(z.enum(['PHYSICAL', 'TACTICAL', 'MENTAL', 'TECHNICAL']))
      .optional(),
  })

  const { id } = addPlayParamsSchema.parse(request.params)
  const {
    play_type: playType,
    video_url: videoUrl,
    photo_url: photoUrl,
    rating,
    observations,
    classifications,
  } = addPlayBodySchema.parse(request.body)

  const playRepository = new PrismaPlayRepository()
  const matchRepository = new PrismaMatchRepository()
  const athleteProfileRepository = new PrismaAthleteProfileRepository()

  const athleteProfile = await athleteProfileRepository.findByUserId(
    request.user.sub,
  )

  if (!athleteProfile) {
    return reply.status(400).send({
      message:
        'Athlete profile not found. Please create your athlete profile first.',
    })
  }

  const addPlayToMatchUseCase = new AddPlayToMatchUseCase(
    playRepository,
    matchRepository,
  )

  const play = await addPlayToMatchUseCase.execute({
    matchId: id,
    athleteProfileId: athleteProfile.id,
    playType,
    videoUrl: videoUrl || null,
    photoUrl: photoUrl || null,
    rating: rating || null,
    observations: observations || null,
    classifications: classifications || [],
  })

  // Incrementar contador de vídeos dentro de jogos se houver vídeo
  if (play.videoUrl) {
    await incrementVideoUsage(request.user.sub)
  }

  // Avisa quem favoritou este atleta, sem aguardar.
  notifyFavoritesInBackground(athleteProfile.id, 'FAVORITE_PLAY')

  return reply.status(201).send({ play })
}
