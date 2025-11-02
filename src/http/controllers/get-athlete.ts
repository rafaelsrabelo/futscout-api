import type { FastifyReply, FastifyRequest } from 'fastify'
import z from 'zod'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaFavoriteRepository } from '../repositories/prisma/prisma-favorite-repository.js'

export async function getAthlete(request: FastifyRequest, reply: FastifyReply) {
  const getAthleteParamsSchema = z.object({
    id: z.string().uuid(),
  })

  const { id } = getAthleteParamsSchema.parse(request.params)

  try {
    const athleteProfileRepository = new PrismaAthleteProfileRepository()
    const favoriteRepository = new PrismaFavoriteRepository()

    // Buscar o perfil do atleta pelo ID
    const athleteProfile = await athleteProfileRepository.findById(id)

    if (!athleteProfile) {
      return reply.status(404).send({ message: 'Athlete not found' })
    }

    // Count how many users favorited this athlete and check if current user favorited
    const userId = request.user.sub
    const [favoritesCount, isFavorite] = await Promise.all([
      favoriteRepository.countFavoritesByAthlete(id),
      favoriteRepository.isFavorite(userId, id),
    ])

    return reply.status(200).send({
      athlete: {
        ...athleteProfile,
        favorites: favoritesCount,
        isFavorite,
      },
    })
  } catch (error) {
    return reply.status(500).send({ message: 'Internal server error' })
  }
}
