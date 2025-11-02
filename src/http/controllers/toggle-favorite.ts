import type { FastifyReply, FastifyRequest } from 'fastify'
import z from 'zod'
import { PrismaFavoriteRepository } from '../repositories/prisma/prisma-favorite-repository.js'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { ToggleFavoriteUseCase } from '../use-cases/toggle-favorite.js'

export async function toggleFavorite(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const toggleFavoriteParamsSchema = z.object({
    id: z.string().uuid(),
  })

  const { id: athleteId } = toggleFavoriteParamsSchema.parse(request.params)
  const userId = request.user.sub

  try {
    const favoriteRepository = new PrismaFavoriteRepository()
    const athleteProfileRepository = new PrismaAthleteProfileRepository()
    const toggleFavoriteUseCase = new ToggleFavoriteUseCase(
      favoriteRepository,
      athleteProfileRepository,
    )

    const { isFavorited } = await toggleFavoriteUseCase.execute({
      userId,
      athleteId,
    })

    return reply.status(200).send({
      message: isFavorited ? 'Athlete favorited' : 'Athlete unfavorited',
      isFavorited,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Athlete not found') {
        return reply.status(404).send({ message: 'Athlete not found' })
      }
      if (error.message === 'You cannot favorite your own profile') {
        return reply
          .status(400)
          .send({ message: 'You cannot favorite your own profile' })
      }
    }

    return reply.status(500).send({ message: 'Internal server error' })
  }
}
