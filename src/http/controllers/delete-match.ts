import type { FastifyReply, FastifyRequest } from 'fastify'
import z from 'zod'
import { PrismaMatchRepository } from '../repositories/prisma/prisma-match-repository.js'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'

export async function deleteMatch(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const deleteMatchParamsSchema = z.object({
    id: z.string().uuid(),
  })

  const { id } = deleteMatchParamsSchema.parse(request.params)
  const userId = request.user.sub

  try {
    const matchRepository = new PrismaMatchRepository()
    const athleteProfileRepository = new PrismaAthleteProfileRepository()

    // Verificar se o usuário tem perfil de atleta
    const athleteProfile = await athleteProfileRepository.findByUserId(userId)

    if (!athleteProfile) {
      return reply.status(404).send({
        message:
          'Athlete profile not found. Please create your athlete profile first.',
      })
    }

    // Verificar se a partida existe e pertence ao atleta
    const match = await matchRepository.findById(id)

    if (!match) {
      return reply.status(404).send({
        message: 'Match not found',
      })
    }

    if (match.athleteId !== athleteProfile.id) {
      return reply.status(403).send({
        message: 'You can only delete your own matches',
      })
    }

    // Deletar a partida
    await matchRepository.delete(id)

    return reply.status(204).send()
  } catch (error) {
    console.error('Error deleting match:', error)
    return reply.status(500).send({
      message: 'Internal server error',
    })
  }
}
