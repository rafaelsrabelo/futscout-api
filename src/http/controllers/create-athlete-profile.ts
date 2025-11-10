import type { FastifyReply, FastifyRequest } from 'fastify'
import z from 'zod'
import { PrismaUsersRepository } from '../repositories/prisma/prisma-users-repository.js'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { CreateAthleteProfileUseCase } from '../use-cases/create-athlete-profile.js'
import { validateCpf } from '../../utils/validateCpf.js'

export async function createAthleteProfile(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const createAthleteProfileBodySchema = z.object({
    cpf: z
      .string()
      .min(11)
      .max(14)
      .refine((cpf) => validateCpf(cpf), {
        message: 'Invalid CPF format',
      }),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
    nickname: z.string().min(3).max(30).optional(),
    profilePhoto: z.string().url().optional(),
    birthDate: z.string().datetime(),
    instagramUrl: z.string().url().optional(),
    twitterUrl: z.string().url().optional(),
    height: z.number().min(50).max(250),
    weight: z.number().min(10).max(200),
    dominantFoot: z.enum(['RIGHT', 'LEFT']),
    primaryPosition: z.enum([
      'GOALKEEPER',
      'DEFENDER',
      'MIDFIELDER',
      'FORWARD',
    ]),
    secondaryPosition: z
      .enum(['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'])
      .optional(),
    currentClub: z.string().max(100).optional(),
    biography: z.string().max(500).optional(),
    hasManager: z.boolean().default(false),
    managerName: z.string().max(100).optional(),
    managerCompany: z.string().max(100).optional(),
    managerContact: z.string().max(100).optional(),
  })

  const userId = request.user.sub
  const data = createAthleteProfileBodySchema.parse(request.body)

  try {
    const prismaUsersRepository = new PrismaUsersRepository()
    const prismaAthleteProfileRepository = new PrismaAthleteProfileRepository()
    const createAthleteProfileUseCase = new CreateAthleteProfileUseCase(
      prismaAthleteProfileRepository,
      prismaUsersRepository,
    )

    const { athleteProfile } = await createAthleteProfileUseCase.execute({
      userId,
      ...data,
    })

    return reply.status(201).send({ athleteProfile })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        return reply.status(404).send({ message: 'User not found' })
      }
      if (error.message === 'User already has an athlete profile') {
        return reply.status(409).send({ message: 'User already has a profile' })
      }
      if (error.message === 'Nickname already exists') {
        return reply.status(409).send({ message: 'Nickname already exists' })
      }
      if (error.message === 'CPF already exists') {
        return reply.status(409).send({ message: 'CPF already exists' })
      }
      if (error.message === 'Invalid CPF format') {
        return reply.status(400).send({ message: 'Invalid CPF format' })
      }
    }

    return reply.status(500).send({ message: 'Internal server error' })
  }
}
