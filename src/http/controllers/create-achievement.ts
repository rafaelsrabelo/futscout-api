import type { FastifyReply, FastifyRequest } from 'fastify'
import z from 'zod'
import { PrismaAchievementRepository } from '../repositories/prisma/prisma-achievement-repository.js'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { CreateAchievementUseCase } from '../use-cases/create-achievement.js'

export async function createAchievement(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const createAchievementBodySchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    category: z.string().min(1, 'Categoria é obrigatória'),
    year: z
      .number()
      .int()
      .min(1900, 'Ano deve ser maior que 1900')
      .max(new Date().getFullYear() + 1, 'Ano inválido'),
    type: z.enum(['COLLECTIVE', 'INDIVIDUAL'], {
      errorMap: () => ({ message: 'Tipo deve ser COLLECTIVE ou INDIVIDUAL' }),
    }),
  })

  try {
    const { name, category, year, type } = createAchievementBodySchema.parse(
      request.body,
    )

    const achievementRepository = new PrismaAchievementRepository()
    const athleteProfileRepository = new PrismaAthleteProfileRepository()

    const createAchievementUseCase = new CreateAchievementUseCase(
      achievementRepository,
      athleteProfileRepository,
    )

    const { achievement } = await createAchievementUseCase.execute({
      userId: request.user.sub,
      name,
      category,
      year,
      type,
    })

    return reply.status(201).send({ achievement })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Athlete profile not found'
    ) {
      return reply.status(404).send({
        message: 'Athlete profile not found. Please create your profile first.',
      })
    }

    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        message: 'Validation error',
        errors: error.errors,
      })
    }

    return reply.status(500).send({ message: 'Internal server error' })
  }
}

