import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaPlayRepository } from '../repositories/prisma/prisma-play-repository.js'
import { DeletePlayUseCase } from '../use-cases/delete-play.js'
import {
  AthleteProfileNotFoundError,
  PlayNotBelongsToAthleteError,
  PlayNotFoundError,
} from '../use-cases/delete-play.js'

export async function deletePlay(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const deletePlayParamsSchema = z.object({
    id: z.string().uuid(),
  })

  const { id } = deletePlayParamsSchema.parse(request.params)

  try {
    const playRepository = new PrismaPlayRepository()
    const athleteProfileRepository = new PrismaAthleteProfileRepository()
    const deletePlayUseCase = new DeletePlayUseCase(
      playRepository,
      athleteProfileRepository,
    )

    await deletePlayUseCase.execute({
      playId: id,
      userId: request.user.sub,
    })

    return reply.status(204).send()
  } catch (error) {
    if (error instanceof PlayNotFoundError) {
      return reply.status(404).send({
        message: error.message,
      })
    }

    if (error instanceof AthleteProfileNotFoundError) {
      return reply.status(404).send({
        message: error.message,
      })
    }

    if (error instanceof PlayNotBelongsToAthleteError) {
      return reply.status(403).send({
        message: error.message,
      })
    }

    console.error('Error deleting play:', error)
    return reply.status(500).send({
      message: 'Erro interno do servidor.',
    })
  }
}

