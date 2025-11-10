import type { FastifyReply, FastifyRequest } from 'fastify'
import z from 'zod'
import { PrismaTeamRepository } from '../repositories/prisma/prisma-team-repository.js'

export async function editTeam(request: FastifyRequest, reply: FastifyReply) {
  const editTeamParamsSchema = z.object({
    id: z.string().uuid(),
  })

  const editTeamBodySchema = z.object({
    name: z.string().min(1).max(100).optional(),
    nickname: z.string().min(1).max(50).optional(),
    acronym: z.string().min(1).max(10).optional(),
    shieldPhoto: z.string().url().optional().nullable(),
    isPrincipal: z.boolean().optional(),
  })

  const { id } = editTeamParamsSchema.parse(request.params)
  const userId = request.user.sub
  const data = editTeamBodySchema.parse(request.body)

  try {
    const prismaTeamRepository = new PrismaTeamRepository()

    // Verificar se o time existe e pertence ao usuário
    const existingTeam = await prismaTeamRepository.findById(id)

    if (!existingTeam) {
      return reply.status(404).send({
        message: 'Team not found',
      })
    }

    if (existingTeam.userId !== userId) {
      return reply.status(403).send({
        message: 'You can only edit your own teams',
      })
    }

    // Verificar se novo nome já existe (se está sendo alterado)
    if (data.name && data.name !== existingTeam.name) {
      const teamWithSameName = await prismaTeamRepository.findByName(
        data.name,
        userId,
      )

      if (teamWithSameName) {
        return reply.status(409).send({
          message: 'You already have a team with this name',
        })
      }
    }

    // Se está marcando como principal, desmarcar outros times principais do usuário
    if (data.isPrincipal === true) {
      await prismaTeamRepository.unsetPrincipalTeams(userId)
    }

    // Atualizar apenas os campos fornecidos
    const updatedTeam = await prismaTeamRepository.update(id, {
      ...(data.name && { name: data.name }),
      ...(data.nickname !== undefined && { nickname: data.nickname }),
      ...(data.acronym && { acronym: data.acronym }),
      ...(data.shieldPhoto !== undefined && { shieldPhoto: data.shieldPhoto }),
      ...(data.isPrincipal !== undefined && { isPrincipal: data.isPrincipal }),
    })

    return reply.status(200).send({
      team: {
        id: updatedTeam.id,
        name: updatedTeam.name,
        nickname: updatedTeam.nickname,
        acronym: updatedTeam.acronym,
        shieldPhoto: updatedTeam.shieldPhoto,
        isPrincipal: updatedTeam.isPrincipal,
        createdAt: updatedTeam.createdAt,
        updatedAt: updatedTeam.updatedAt,
      },
    })
  } catch (error) {
    return reply.status(500).send({ message: 'Internal server error' })
  }
}
