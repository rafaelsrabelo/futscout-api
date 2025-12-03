import type { FastifyReply, FastifyRequest } from 'fastify'
import z from 'zod'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaFavoriteRepository } from '../repositories/prisma/prisma-favorite-repository.js'
import { ListAthletesUseCase } from '../use-cases/list-athletes.js'
import { isUserPremium } from '../utils/check-premium.js'

export async function publicListAthletes(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const listAthletesQuerySchema = z.object({
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    dominantFoot: z.enum(['RIGHT', 'LEFT']).optional(),
    primaryPosition: z
      .enum(['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'])
      .optional(),
    currentClub: z.string().optional(),
    nickname: z.string().optional(),
    name: z.string().optional(),
    hasManager: z
      .string()
      .transform((val) => val === 'true')
      .optional(),
    minHeight: z.string().transform(Number).optional(),
    maxHeight: z.string().transform(Number).optional(),
    minWeight: z.string().transform(Number).optional(),
    maxWeight: z.string().transform(Number).optional(),
    page: z.string().transform(Number).default(1),
    limit: z.string().transform(Number).default(20),
  })

  const filters = listAthletesQuerySchema.parse(request.query)

  try {
    const prismaAthleteProfileRepository = new PrismaAthleteProfileRepository()
    const favoriteRepository = new PrismaFavoriteRepository()
    const listAthletesUseCase = new ListAthletesUseCase(
      prismaAthleteProfileRepository,
    )

    // Remove undefined values from filters
    const cleanFilters = Object.fromEntries(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Object.entries(filters).filter(([_, value]) => value !== undefined),
    ) as Parameters<typeof listAthletesUseCase.execute>[0]

    const { athletes } = await listAthletesUseCase.execute(cleanFilters)

    // Add favorites count and premium status to each athlete
    const athletesWithFavorites = await Promise.all(
      athletes.map(async (athlete) => {
        const [favoritesCount, isPremium] = await Promise.all([
          favoriteRepository.countFavoritesByAthlete(athlete.id),
          isUserPremium(athlete.userId),
        ])
        return {
          ...athlete,
          favorites: favoritesCount,
          isFavorite: false, // Always false for public access
          isPremium,
        }
      }),
    )

    // Ordenar: premium primeiro, depois não-premium
    // Dentro de cada grupo, ordenar por createdAt desc (mais recente primeiro)
    const sortedAthletes = athletesWithFavorites.sort((a, b) => {
      // Primeiro critério: premium vem antes de não-premium
      if (a.isPremium !== b.isPremium) {
        return a.isPremium ? -1 : 1 // Premium primeiro
      }
      // Segundo critério: se ambos têm mesmo status premium, ordenar por data (mais recente primeiro)
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return dateB - dateA // Descendente (mais recente primeiro)
    })

    return reply.status(200).send({
      athletes: sortedAthletes,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: athletes.length,
      },
    })
  } catch (error) {
    console.error('Error listing athletes:', error)
    return reply.status(500).send({ message: 'Internal server error' })
  }
}
