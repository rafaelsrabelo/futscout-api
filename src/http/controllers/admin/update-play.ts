import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaPlayRepository } from '../../repositories/prisma/prisma-play-repository.js'
import {
  PlayNotFoundError,
  UpdatePlayAdminUseCase,
} from '../../use-cases/admin/update-play.js'

const paramsSchema = z.object({
  id: z.uuid('ID inválido.'),
})

const playTypeSchema = z.enum([
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
])

const bodySchema = z.object({
  playType: playTypeSchema.optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  observations: z.string().nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  classifications: z
    .array(z.enum(['PHYSICAL', 'TACTICAL', 'MENTAL', 'TECHNICAL']))
    .optional(),
})

export async function updatePlayAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = paramsSchema.parse(request.params)
  const body = bodySchema.parse(request.body)

  const useCase = new UpdatePlayAdminUseCase(new PrismaPlayRepository())

  try {
    const play = await useCase.execute({ playId: id, ...body })
    return reply.status(200).send(play)
  } catch (error) {
    if (error instanceof PlayNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}
