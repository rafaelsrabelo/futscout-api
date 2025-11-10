import type { FastifyReply, FastifyRequest } from 'fastify'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaTeamHistoryRepository } from '../repositories/prisma/prisma-team-history-repository.js'

export async function listTeamHistory(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const userId = request.user.sub

  try {
    const prismaAthleteProfileRepository = new PrismaAthleteProfileRepository()
    const prismaTeamHistoryRepository = new PrismaTeamHistoryRepository()

    // Verificar se o usuário tem perfil de atleta
    const athleteProfile =
      await prismaAthleteProfileRepository.findByUserId(userId)

    if (!athleteProfile) {
      return reply.status(404).send({
        message: 'Athlete profile not found',
      })
    }

    // Buscar histórico completo
    const teamHistory = await prismaTeamHistoryRepository.findByAthleteId(
      athleteProfile.id,
    )

    return reply.status(200).send({
      teamHistory: teamHistory.map((th) => {
        // @ts-expect-error - Prisma include relation type issue
        const team = th.team
        const startYear = th.startDate.getFullYear()
        const endYear = th.endDate ? th.endDate.getFullYear() : 'atual'

        return {
          id: th.id,
          team: {
            id: team.id,
            name: team.name,
            nickname: team.nickname,
            acronym: team.acronym,
            shieldPhoto: team.shieldPhoto,
          },
          period: `${startYear}-${endYear}`,
          startDate: th.startDate,
          endDate: th.endDate,
          createdAt: th.createdAt,
        }
      }),
    })
  } catch (error) {
    console.error('Error listing team history:', error)
    return reply.status(500).send({ message: 'Internal server error' })
  }
}
