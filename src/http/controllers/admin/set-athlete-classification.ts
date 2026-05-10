import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaAthleteClassificationLogRepository } from '../../repositories/prisma/prisma-athlete-classification-log-repository.js'
import { PrismaAthleteProfileRepository } from '../../repositories/prisma/prisma-athlete-profile-repository.js'
import { AthleteNotFoundError } from '../../use-cases/admin/errors/athlete-not-found-error.js'
import { SetAthleteClassificationUseCase } from '../../use-cases/admin/set-athlete-classification.js'

const paramsSchema = z.object({
  id: z.uuid('ID inválido.'),
})

// `null` em classification permite remover a classificação (admin pode
// "des-classificar" um atleta — fica registrado no histórico).
const bodySchema = z.object({
  classification: z.enum(['DESENVOLVIMENTO', 'PERFORMANCE']).nullable(),
  comment: z.string().trim().max(500).optional(),
})

export async function setAthleteClassificationAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = paramsSchema.parse(request.params)
  const { classification, comment } = bodySchema.parse(request.body)
  const adminUserId = request.user.sub

  const useCase = new SetAthleteClassificationUseCase(
    new PrismaAthleteProfileRepository(),
    new PrismaAthleteClassificationLogRepository(),
  )

  try {
    const result = await useCase.execute({
      athleteProfileId: id,
      classification,
      comment: comment ?? null,
      adminUserId,
    })

    return reply.status(200).send({
      athleteProfile: {
        id: result.athleteProfile.id,
        userId: result.athleteProfile.userId,
        classification: result.athleteProfile.classification,
        updatedAt: result.athleteProfile.updatedAt,
      },
      log: {
        id: result.log.id,
        classification: result.log.classification,
        comment: result.log.comment,
        classifiedById: result.log.classifiedById,
        createdAt: result.log.createdAt,
      },
    })
  } catch (error) {
    if (error instanceof AthleteNotFoundError) {
      return reply.status(404).send({ message: 'Atleta não encontrado.' })
    }
    throw error
  }
}
