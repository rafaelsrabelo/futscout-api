import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import type {
  PlayType,
  PlayClassification,
} from '../../../generated/prisma/client.js'
import { UpdatePlayUseCase } from '../use-cases/update-play.js'
import { PrismaPlayRepository } from '../repositories/prisma/prisma-play-repository.js'

export async function updatePlay(request: FastifyRequest, reply: FastifyReply) {
  const updatePlayParamsSchema = z.object({
    playId: z.string().uuid(),
  })

  const updatePlayBodySchema = z.object({
    play_type: z.string().optional(),
    rating: z.number().min(1).max(5).optional(),
    observations: z.string().optional(),
    classifications: z
      .array(z.enum(['PHYSICAL', 'TACTICAL', 'MENTAL', 'TECHNICAL']))
      .optional(),
  })

  const { playId } = updatePlayParamsSchema.parse(request.params)
  const {
    play_type: playType,
    rating,
    observations,
    classifications,
  } = updatePlayBodySchema.parse(request.body)

  try {
    const playRepository = new PrismaPlayRepository()
    const updatePlayUseCase = new UpdatePlayUseCase(playRepository)

    const updateData = {
      playId,
      ...(playType && { playType: playType as PlayType }),
      ...(rating !== undefined && { rating }),
      ...(observations && { observations }),
      ...(classifications && {
        classifications: classifications as PlayClassification[],
      }),
    }

    const { play } = await updatePlayUseCase.execute(updateData)

    return reply.status(200).send({
      play,
    })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'Play not found') {
        return reply.status(404).send({ message: 'Play not found.' })
      }
    }

    throw err
  }
}
