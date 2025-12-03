import type { FastifyReply, FastifyRequest } from 'fastify'
import z from 'zod'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaTeamRepository } from '../repositories/prisma/prisma-team-repository.js'

export async function editTeam(request: FastifyRequest, reply: FastifyReply) {
  const editTeamParamsSchema = z.object({
    id: z.string().uuid(),
  })

  const editTeamBodySchema = z.object({
    name: z.string().min(1).max(100).optional(),
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
      ...(data.acronym !== undefined && { acronym: data.acronym }),
      ...(data.shieldPhoto !== undefined && { shieldPhoto: data.shieldPhoto }),
      ...(data.isPrincipal !== undefined && { isPrincipal: data.isPrincipal }),
    })

    // Se está marcando como principal, atualizar o currentClub do perfil do atleta
    if (data.isPrincipal === true) {
      const athleteProfileRepository = new PrismaAthleteProfileRepository()
      try {
        await athleteProfileRepository.update(userId, {
          currentClub: updatedTeam.name,
        })
      } catch (error) {
        // Se não conseguir atualizar o perfil do atleta, não falhar a operação do time
        console.warn('Failed to update currentClub in athlete profile:', error)
      }
    }

    // Se está desmarcando como principal, limpar o currentClub do perfil do atleta
    if (data.isPrincipal === false) {
      const athleteProfileRepository = new PrismaAthleteProfileRepository()
      try {
        await athleteProfileRepository.update(userId, {
          currentClub: null,
        })
      } catch (error) {
        // Se não conseguir atualizar o perfil do atleta, não falhar a operação do time
        console.warn('Failed to clear currentClub in athlete profile:', error)
      }
    }

    return reply.status(200).send({
      team: {
        id: updatedTeam.id,
        name: updatedTeam.name,
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
