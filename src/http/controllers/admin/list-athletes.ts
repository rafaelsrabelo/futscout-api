import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaAthleteProfileRepository } from '../../repositories/prisma/prisma-athlete-profile-repository.js'
import { ListAthletesAdminUseCase } from '../../use-cases/admin/list-athletes.js'

const listAthletesAdminQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().min(1).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  primaryPosition: z
    .enum(['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'])
    .optional(),
  dominantFoot: z.enum(['RIGHT', 'LEFT']).optional(),
  currentClub: z.string().trim().min(1).optional(),
  hasManager: z.coerce.boolean().optional(),
  // 'UNCLASSIFIED' devolve só os atletas com perfil ainda sem classificação.
  classification: z
    .enum(['DESENVOLVIMENTO', 'PERFORMANCE', 'UNCLASSIFIED'])
    .optional(),
  minAge: z.coerce.number().int().min(0).max(120).optional(),
  maxAge: z.coerce.number().int().min(0).max(120).optional(),
  minHeight: z.coerce.number().positive().optional(),
  maxHeight: z.coerce.number().positive().optional(),
  minWeight: z.coerce.number().positive().optional(),
  maxWeight: z.coerce.number().positive().optional(),
})

export async function listAthletesAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const query = listAthletesAdminQuerySchema.parse(request.query)

  if (
    query.minAge !== undefined &&
    query.maxAge !== undefined &&
    query.minAge > query.maxAge
  ) {
    return reply.status(400).send({
      message: 'minAge não pode ser maior que maxAge.',
    })
  }

  const athleteProfileRepository = new PrismaAthleteProfileRepository()
  const listAthletesAdminUseCase = new ListAthletesAdminUseCase(
    athleteProfileRepository,
  )

  const result = await listAthletesAdminUseCase.execute(query)

  return reply.status(200).send(result)
}
