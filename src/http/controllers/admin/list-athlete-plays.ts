import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaAthleteProfileRepository } from '../../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaPlayRepository } from '../../repositories/prisma/prisma-play-repository.js'
import { AthleteNotFoundError } from '../../use-cases/admin/list-athlete-matches.js'
import { ListAthletePlaysAdminUseCase } from '../../use-cases/admin/list-athlete-plays.js'

const paramsSchema = z.object({
  athleteId: z.string().uuid(),
})

const playTypeEnum = z.enum([
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

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  hasVideo: z
    .union([z.enum(['true', 'false']), z.boolean()])
    .transform((v) => (typeof v === 'boolean' ? v : v === 'true'))
    .optional(),
  playType: playTypeEnum.optional(),
  matchId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})

export async function listAthletePlaysAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { athleteId } = paramsSchema.parse(request.params)
  const query = querySchema.parse(request.query)

  const playRepository = new PrismaPlayRepository()
  const athleteProfileRepository = new PrismaAthleteProfileRepository()
  const useCase = new ListAthletePlaysAdminUseCase(
    playRepository,
    athleteProfileRepository,
  )

  try {
    const result = await useCase.execute({
      athleteProfileId: athleteId,
      ...query,
    })
    return reply.status(200).send(result)
  } catch (error) {
    if (error instanceof AthleteNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}
