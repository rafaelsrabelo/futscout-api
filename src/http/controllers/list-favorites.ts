import type { FastifyReply, FastifyRequest } from 'fastify'
import z from 'zod'
import { PrismaFavoriteRepository } from '../repositories/prisma/prisma-favorite-repository.js'
import { ListFavoritesUseCase } from '../use-cases/list-favorites.js'
import { isUserPremium } from '../utils/check-premium.js'

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

    // Adicionar isPremium para cada atleta favoritado
    const favoritesWithPremium = await Promise.all(
      favorites.map(async (favorite) => {
        const isPremium = await isUserPremium(favorite.athlete.userId)
        return {
          ...favorite,
          athlete: {
            ...favorite.athlete,
            isPremium,
          },
        }
      }),
    )

    // Ordenar: premium primeiro, depois não-premium
    // Dentro de cada grupo, ordenar por createdAt desc (mais recente primeiro)
    const sortedFavorites = favoritesWithPremium.sort((a, b) => {
      // Primeiro critério: premium vem antes de não-premium
      if (a.athlete.isPremium !== b.athlete.isPremium) {
        return a.athlete.isPremium ? -1 : 1 // Premium primeiro
      }
      // Segundo critério: se ambos têm mesmo status premium, ordenar por data de favorito (mais recente primeiro)
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return dateB - dateA // Descendente (mais recente primeiro)
    })

    return reply.status(200).send({
      favorites: sortedFavorites,
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
