import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { AddPlayToMatchUseCase } from '../use-cases/add-play-to-match.js'
import { PrismaPlayRepository } from '../repositories/prisma/prisma-play-repository.js'
import { PrismaMatchRepository } from '../repositories/prisma/prisma-match-repository.js'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'

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
    ]),
    video_url: z.string().url().optional(),
    photo_url: z.string().url().optional(),
    rating: z.number().int().min(1).max(5).optional(),
    approximate_time: z.number().int().min(0).max(120).optional(),
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
    approximate_time: approximateTime,
    observations,
    classifications,
  } = addPlayBodySchema.parse(request.body)

  const playRepository = new PrismaPlayRepository()
  const matchRepository = new PrismaMatchRepository()
  const athleteProfileRepository = new PrismaAthleteProfileRepository()
  const addPlayToMatchUseCase = new AddPlayToMatchUseCase(
    playRepository,
    matchRepository,
    athleteProfileRepository,
  )

  const play = await addPlayToMatchUseCase.execute({
    matchId: id,
    userId: request.user.sub,
    playType,
    videoUrl: videoUrl || null,
    photoUrl: photoUrl || null,
    rating: rating || null,
    approximateTime: approximateTime || null,
    observations: observations || null,
    classifications: classifications || [],
  })

  return reply.status(201).send({ play })
}
