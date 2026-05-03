import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaAthleteProfileRepository } from '../../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaPlayRepository } from '../../repositories/prisma/prisma-play-repository.js'
import {
  AthleteNotFoundError,
  CreateStandalonePlayAdminUseCase,
} from '../../use-cases/admin/create-standalone-play.js'
import { generateThumbnailAsync } from '../create-play-with-video-url.js'

const paramsSchema = z.object({
  athleteId: z.uuid('athleteId inválido.'),
})

const bodySchema = z.object({
  playType: z.enum([
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
  videoUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  photoUrl: z.string().url().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  observations: z.string().optional(),
  classifications: z
    .array(z.enum(['PHYSICAL', 'TACTICAL', 'MENTAL', 'TECHNICAL']))
    .optional(),
})

export async function createStandalonePlayAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { athleteId } = paramsSchema.parse(request.params)
  const body = bodySchema.parse(request.body)

  const useCase = new CreateStandalonePlayAdminUseCase(
    new PrismaPlayRepository(),
    new PrismaAthleteProfileRepository(),
  )

  try {
    const play = await useCase.execute({
      athleteProfileId: athleteId,
      playType: body.playType,
      videoUrl: body.videoUrl ?? null,
      thumbnailUrl: body.thumbnailUrl ?? null,
      photoUrl: body.photoUrl ?? null,
      rating: body.rating ?? null,
      observations: body.observations ?? null,
      classifications: body.classifications ?? [],
    })

    if (body.videoUrl && !body.thumbnailUrl) {
      setTimeout(() => {
        generateThumbnailAsync(play.id, body.videoUrl!).catch((error) => {
          console.error('[ADMIN][THUMBNAIL] background generation failed:', {
            playId: play.id,
            error: error instanceof Error ? error.message : String(error),
          })
        })
      }, 0)
    }

    return reply.status(201).send(play)
  } catch (error) {
    if (error instanceof AthleteNotFoundError) {
      return reply.status(404).send({ message: 'Atleta não encontrado.' })
    }
    throw error
  }
}
