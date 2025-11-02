import type { FastifyReply, FastifyRequest } from 'fastify'
import z from 'zod'
import { PrismaFavoriteRepository } from '../repositories/prisma/prisma-favorite-repository.js'
import { ListFavoritesUseCase } from '../use-cases/list-favorites.js'

export async function listFavorites(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const listFavoritesQuerySchema = z.object({
    page: z.string().transform(Number).default(1),
    limit: z.string().transform(Number).default(20),
  })

  const { page, limit } = listFavoritesQuerySchema.parse(request.query)
  const userId = request.user.sub

  try {
    const favoriteRepository = new PrismaFavoriteRepository()
    const listFavoritesUseCase = new ListFavoritesUseCase(favoriteRepository)

    const { favorites } = await listFavoritesUseCase.execute({
      userId,
      page,
      limit,
    })

    return reply.status(200).send({
      favorites,
      pagination: {
        page,
        limit,
        total: favorites.length,
      },
    })
  } catch (error) {
    return reply.status(500).send({ message: 'Internal server error' })
  }
}
