import { prisma } from '@/lib/prisma.js'
import type {
  FavoriteRepository,
  FavoriteFilters,
  FavoriteWithAthlete,
} from '../favorite-repository.js'

export class PrismaFavoriteRepository implements FavoriteRepository {
  async toggleFavorite(userId: string, athleteId: string): Promise<boolean> {
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_athleteId: {
          userId,
          athleteId,
        },
      },
    })

    if (existingFavorite) {
      // Unfavorite - remove from favorites
      await prisma.favorite.delete({
        where: { id: existingFavorite.id },
      })
      return false
    } else {
      // Favorite - add to favorites
      await prisma.favorite.create({
        data: {
          userId,
          athleteId,
        },
      })
      return true
    }
  }

  async isFavorite(userId: string, athleteId: string): Promise<boolean> {
    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_athleteId: {
          userId,
          athleteId,
        },
      },
    })

    return !!favorite
  }

  async findFavoritesByUser(
    filters: FavoriteFilters,
  ): Promise<FavoriteWithAthlete[]> {
    const { userId, page = 1, limit = 20 } = filters

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        athlete: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    })

    return favorites
  }

  async countFavoritesByAthlete(athleteId: string): Promise<number> {
    const count = await prisma.favorite.count({
      where: { athleteId },
    })

    return count
  }
}