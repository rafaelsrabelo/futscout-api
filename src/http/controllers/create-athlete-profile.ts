import type { FastifyReply, FastifyRequest } from 'fastify'
import z from 'zod'
import { PrismaAddressRepository } from '../repositories/prisma/prisma-address-repository.js'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaUsersRepository } from '../repositories/prisma/prisma-users-repository.js'
import { CreateAthleteProfileUseCase } from '../use-cases/create-athlete-profile.js'

export async function createAthleteProfile(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // `name` não entra aqui: o nome é definido no cadastro (POST /auth/register).
  // Versões antigas do mobile ainda podem mandá-lo — o Zod descarta em silêncio.
  const createAthleteProfileBodySchema = z.object({
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
    nickname: z.string().min(3).max(30).optional(),
    profilePhoto: z.string().url().optional(),
    birthDate: z.string().datetime(),
    instagramUrl: z.string().url().optional(),
    twitterUrl: z.string().url().optional(),
    youtubeUrl: z.string().url().optional(),
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
    hasNutritionist: z.boolean().optional(),
    hasPsychologist: z.boolean().optional(),
    hasPersonalTrainer: z.boolean().default(false),
    // Aliases vindos do mobile (versões antigas) — mergeados abaixo
    hasNutritionalSupport: z.boolean().optional(),
    hasPsychologicalSupport: z.boolean().optional(),
    // Campos de endereço (opcionais)
    zipCode: z.string().max(10).optional(),
    street: z.string().max(255).optional(),
    number: z.string().max(20).optional(),
    complement: z.string().max(100).optional(),
    district: z.string().max(100).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    country: z.string().max(100).optional(),

    // Campos de time (opcionais).
    // name/acronym/shieldPhoto fazem trim e tratam string vazia como undefined
    // — o mobile manda "" quando o usuário toca e limpa o input, e o min(1)
    // antigo derrubava o request.
    team: z.object({
      name: z
        .string()
        .max(100)
        .transform((v) => (v && v.trim() ? v.trim() : ''))
        .refine((v) => v.length >= 1, { message: 'Team name is required' }),
      acronym: z
        .string()
        .max(10)
        .optional()
        .transform((v) => (v && v.trim() ? v.trim() : undefined)),
      shieldPhoto: z
        .string()
        .optional()
        .transform((v) => (v && v.trim() ? v.trim() : undefined))
        .refine((v) => v === undefined || /^https?:\/\//.test(v), {
          message: 'shieldPhoto must be a valid URL',
        }),
      isPrincipal: z.boolean().optional().default(false),
    }).optional(),
  })

  const userId = request.user.sub
  const parsed = createAthleteProfileBodySchema.parse(request.body)
  const {
    hasNutritionalSupport,
    hasPsychologicalSupport,
    hasNutritionist,
    hasPsychologist,
    ...rest
  } = parsed
  const data = {
    ...rest,
    hasNutritionist: hasNutritionist ?? hasNutritionalSupport ?? false,
    hasPsychologist: hasPsychologist ?? hasPsychologicalSupport ?? false,
  }

  try {
    const prismaUsersRepository = new PrismaUsersRepository()
    const prismaAthleteProfileRepository = new PrismaAthleteProfileRepository()
    const prismaAddressRepository = new PrismaAddressRepository()
    const prismaTeamRepository = new (await import('../repositories/prisma/prisma-team-repository.js')).PrismaTeamRepository()
    const createAthleteProfileUseCase = new CreateAthleteProfileUseCase(
      prismaAthleteProfileRepository,
      prismaUsersRepository,
      prismaAddressRepository,
      prismaTeamRepository,
    )


    const { athleteProfile, team } = await createAthleteProfileUseCase.execute({
      userId,
      ...data,
    })

    return reply.status(201).send({ athleteProfile, team })
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
    }

    return reply.status(500).send({ message: 'Internal server error' })
  }
}
