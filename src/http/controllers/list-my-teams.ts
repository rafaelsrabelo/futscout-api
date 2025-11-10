import type { FastifyReply, FastifyRequest } from 'fastify'
import { PrismaTeamRepository } from '../repositories/prisma/prisma-team-repository.js'

export async function listMyTeams(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const userId = request.user.sub

  try {
    const prismaTeamRepository = new PrismaTeamRepository()
    const teams = await prismaTeamRepository.findByUserId(userId)

    return reply.status(200).send({
      teams: teams.map((team) => ({
        id: team.id,
        name: team.name,
        nickname: team.nickname,
        acronym: team.acronym,
        shieldPhoto: team.shieldPhoto,
        isPrincipal: team.isPrincipal,
        createdAt: team.createdAt,
      })),
    })
  } catch (error) {
    return reply.status(500).send({ message: 'Internal server error' })
  }
}
