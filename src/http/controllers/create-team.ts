import type { FastifyReply, FastifyRequest } from 'fastify'
import z from 'zod'
import { PrismaTeamRepository } from '../repositories/prisma/prisma-team-repository.js'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'

export async function createTeam(request: FastifyRequest, reply: FastifyReply) {
  const createTeamBodySchema = z.object({
    name: z.string().min(1).max(100),
    nickname: z.string().min(1).max(50).optional(),
    acronym: z.string().min(1).max(10),
    shieldPhoto: z.string().url().optional(),
    isPrincipal: z.boolean().optional().default(false),
  })

  const userId = request.user.sub
  const data = createTeamBodySchema.parse(request.body)

  try {
    const prismaTeamRepository = new PrismaTeamRepository()

    // Verificar se já existe um time com o mesmo nome para este usuário
    const existingTeam = await prismaTeamRepository.findByName(
      data.name,
      userId,
    )

    if (existingTeam) {
      return reply.status(409).send({
        message: 'You already have a team with this name',
      })
    }

    // Se estiver marcando como principal, desmarcar outros times principais do usuário
    if (data.isPrincipal) {
      await prismaTeamRepository.unsetPrincipalTeams(userId)
    }

    const team = await prismaTeamRepository.create({
      name: data.name,
      nickname: data.nickname || null,
      acronym: data.acronym,
      shieldPhoto: data.shieldPhoto || null,
      isPrincipal: data.isPrincipal,
      userId,
    })

    // Se está criando como principal, atualizar o currentClub do perfil do atleta
    if (data.isPrincipal) {
      const athleteProfileRepository = new PrismaAthleteProfileRepository()
      try {
        await athleteProfileRepository.update(userId, {
          currentClub: team.name,
        })
      } catch (error) {
        // Se não conseguir atualizar o perfil do atleta, não falhar a operação do time
        console.warn('Failed to update currentClub in athlete profile:', error)
      }
    }

    return reply.status(201).send({
      team: {
        id: team.id,
        name: team.name,
        nickname: team.nickname,
        acronym: team.acronym,
        shieldPhoto: team.shieldPhoto,
        isPrincipal: team.isPrincipal,
        createdAt: team.createdAt,
      },
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Team name already exists') {
        return reply.status(409).send({
          message: 'You already have a team with this name',
        })
      }
    }

    return reply.status(500).send({ message: 'Internal server error' })
  }
}
