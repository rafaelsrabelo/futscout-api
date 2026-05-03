import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaAchievementRepository } from '../../repositories/prisma/prisma-achievement-repository.js'
import { PrismaAthleteProfileRepository } from '../../repositories/prisma/prisma-athlete-profile-repository.js'
import {
  AthleteNotFoundError,
  CreateAchievementAdminUseCase,
} from '../../use-cases/admin/create-achievement.js'

const paramsSchema = z.object({
  athleteId: z.uuid('athleteId inválido.'),
})

const bodySchema = z.object({
  name: z.string().min(1).max(120),
  category: z.string().min(1).max(60),
  year: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1),
  type: z.enum(['COLLECTIVE', 'INDIVIDUAL']),
})

export async function createAchievementAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { athleteId } = paramsSchema.parse(request.params)
  const body = bodySchema.parse(request.body)

  const useCase = new CreateAchievementAdminUseCase(
    new PrismaAchievementRepository(),
    new PrismaAthleteProfileRepository(),
  )

  try {
    const achievement = await useCase.execute({
      athleteProfileId: athleteId,
      ...body,
    })
    return reply.status(201).send(achievement)
  } catch (error) {
    if (error instanceof AthleteNotFoundError) {
      return reply.status(404).send({ message: 'Atleta não encontrado.' })
    }
    throw error
  }
}
