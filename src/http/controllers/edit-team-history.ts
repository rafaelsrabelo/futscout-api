import type { FastifyReply, FastifyRequest } from 'fastify'
import z from 'zod'
import { PrismaTeamHistoryRepository } from '../repositories/prisma/prisma-team-history-repository.js'
import { PrismaTeamRepository } from '../repositories/prisma/prisma-team-repository.js'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'

export async function editTeamHistory(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const editTeamHistoryParamsSchema = z.object({
    id: z.string().uuid(),
  })

  const editTeamHistoryBodySchema = z.object({
    teamId: z.string().uuid().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional().nullable(),
  })

  const { id } = editTeamHistoryParamsSchema.parse(request.params)
  const userId = request.user.sub
  const data = editTeamHistoryBodySchema.parse(request.body)

  try {
    const prismaTeamHistoryRepository = new PrismaTeamHistoryRepository()
    const prismaTeamRepository = new PrismaTeamRepository()
    const prismaAthleteProfileRepository = new PrismaAthleteProfileRepository()

    // Verificar se o histórico existe e pertence ao usuário
    const existingHistory = await prismaTeamHistoryRepository.findById(id)

    if (!existingHistory) {
      return reply.status(404).send({
        message: 'Team history not found',
      })
    }

    // Verificar se o atleta tem perfil
    const athleteProfile =
      await prismaAthleteProfileRepository.findByUserId(userId)
    if (!athleteProfile) {
      return reply.status(404).send({
        message: 'Athlete profile not found',
      })
    }

    if (existingHistory.athleteId !== athleteProfile.id) {
      return reply.status(403).send({
        message: 'You can only edit your own team history',
      })
    }

    // Se está mudando o time, verificar se o novo time pertence ao usuário
    if (data.teamId && data.teamId !== existingHistory.teamId) {
      const newTeam = await prismaTeamRepository.findById(data.teamId)

      if (!newTeam) {
        return reply.status(404).send({
          message: 'Team not found',
        })
      }

      if (newTeam.userId !== userId) {
        return reply.status(403).send({
          message: 'You can only use your own teams in history',
        })
      }
    }

    // Validar datas se fornecidas
    const startDate = data.startDate
      ? new Date(data.startDate)
      : existingHistory.startDate
    const endDate =
      data.endDate !== undefined
        ? data.endDate
          ? new Date(data.endDate)
          : null
        : existingHistory.endDate

    if (endDate && startDate >= endDate) {
      return reply.status(400).send({
        message: 'End date must be after start date',
      })
    }

    // Atualizar apenas os campos fornecidos
    const updatedHistory = await prismaTeamHistoryRepository.update(id, {
      ...(data.teamId && { team: { connect: { id: data.teamId } } }),
      ...(data.startDate && { startDate }),
      ...(data.endDate !== undefined && { endDate }),
    })

    const historyWithTeam = await prismaTeamHistoryRepository.findById(
      updatedHistory.id,
    )

    return reply.status(200).send({
      teamHistory: historyWithTeam,
    })
  } catch (error) {
    return reply.status(500).send({ message: 'Internal server error' })
  }
}
