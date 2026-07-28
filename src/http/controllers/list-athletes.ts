import type { FastifyReply, FastifyRequest } from 'fastify'
import z from 'zod'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { ListAthletesUseCase } from '../use-cases/list-athletes.js'
import {
  enrichAthletesWithFlags,
  sortByPremiumAndDate,
} from '../utils/athlete-list-helpers.js'
import { coerceAthleteNullStrings } from '../utils/null-strings-to-empty.js'

export async function listAthletes(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const listAthletesQuerySchema = z.object({
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    dominantFoot: z.enum(['RIGHT', 'LEFT']).optional(),
    primaryPosition: z
      .enum(['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'])
      .optional(),
    secondaryPosition: z
      .enum(['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'])
      .optional(),
    classification: z.enum(['DESENVOLVIMENTO', 'PERFORMANCE']).optional(),
    currentClub: z.string().optional(),
    nickname: z.string().optional(),
    name: z.string().optional(),
    hasManager: z
      .string()
      .transform((val) => val === 'true')
      .optional(),
    minHeight: z.string().transform(Number).optional(),
    maxHeight: z.string().transform(Number).optional(),
    minWeight: z.string().transform(Number).optional(),
    maxWeight: z.string().transform(Number).optional(),
    minAge: z.string().transform(Number).optional(),
    maxAge: z.string().transform(Number).optional(),
    page: z.string().transform(Number).default(1),
    limit: z.string().transform(Number).default(20),
  })

  const filters = listAthletesQuerySchema.parse(request.query)

  try {
    const prismaAthleteProfileRepository = new PrismaAthleteProfileRepository()
    const listAthletesUseCase = new ListAthletesUseCase(
      prismaAthleteProfileRepository,
    )

    const cleanFilters = Object.fromEntries(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Object.entries(filters).filter(([_, value]) => value !== undefined),
    ) as Parameters<typeof listAthletesUseCase.execute>[0]

    const { athletes, total } = await listAthletesUseCase.execute(cleanFilters)

    const userId = request.user.sub
    const enriched = await enrichAthletesWithFlags(athletes, userId)
    const sortedAthletes = sortByPremiumAndDate(enriched)

    const totalPages = Math.max(1, Math.ceil(total / filters.limit))

    return reply.status(200).send({
      athletes: sortedAthletes.map((a) => coerceAthleteNullStrings(a)),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages,
        hasMore: filters.page < totalPages,
      },
    })
  } catch (error) {
    console.error('Error listing athletes:', error)
    return reply.status(500).send({ message: 'Internal server error' })
  }
}
