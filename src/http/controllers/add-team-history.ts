import type { FastifyReply, FastifyRequest } from 'fastify'
import z from 'zod'
import { PrismaTeamHistoryRepository } from '../repositories/prisma/prisma-team-history-repository.js'
import { PrismaTeamRepository } from '../repositories/prisma/prisma-team-repository.js'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'

export async function addTeamHistory(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const addTeamHistoryBodySchema = z.object({
    teamId: z.string().uuid(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
  })

  const userId = request.user.sub
  const data = addTeamHistoryBodySchema.parse(request.body)

  try {
    const prismaTeamHistoryRepository = new PrismaTeamHistoryRepository()
    const prismaTeamRepository = new PrismaTeamRepository()
    const prismaAthleteProfileRepository = new PrismaAthleteProfileRepository()

    // Verificar se o time existe e pertence ao usuário
    const team = await prismaTeamRepository.findById(data.teamId)
    if (!team) {
      return reply.status(404).send({ message: 'Team not found' })
    }

    if (team.userId !== userId) {
      return reply.status(403).send({ message: 'Team does not belong to you' })
    }

    // Buscar o perfil do atleta
    const athleteProfile =
      await prismaAthleteProfileRepository.findByUserId(userId)
    if (!athleteProfile) {
      return reply.status(404).send({ message: 'Athlete profile not found' })
    }

    // Validar datas
    const startDate = new Date(data.startDate)
    const endDate = data.endDate ? new Date(data.endDate) : null

    if (endDate && startDate >= endDate) {
      return reply.status(400).send({
        message: 'End date must be after start date',
      })
    }

    const teamHistory = await prismaTeamHistoryRepository.create({
      athlete: {
        connect: { id: athleteProfile.id },
      },
      team: {
        connect: { id: data.teamId },
      },
      startDate,
      endDate,
    })

    const teamHistoryWithTeam = await prismaTeamHistoryRepository.findById(
      teamHistory.id,
    )

    return reply.status(201).send({
      teamHistory: teamHistoryWithTeam,
    })
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error adding team history:', error.message)
    }
    return reply.status(500).send({ message: 'Internal server error' })
  }
}
