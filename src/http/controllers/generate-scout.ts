import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { GenerateScoutUseCase } from '../use-cases/generate-scout.js'
import { PrismaScoutRepository } from '../repositories/prisma/prisma-scout-repository.js'
import { PrismaPlayRepository } from '../repositories/prisma/prisma-play-repository.js'

export async function generateScout(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const generateScoutParamsSchema = z.object({
    id: z.string().uuid(),
  })

  const { id } = generateScoutParamsSchema.parse(request.params)

  const scoutRepository = new PrismaScoutRepository()
  const playRepository = new PrismaPlayRepository()
  const generateScoutUseCase = new GenerateScoutUseCase(
    scoutRepository,
    playRepository,
  )

  const { scout } = await generateScoutUseCase.execute({
    matchId: id,
  })

  // Parse dos arrays JSON para resposta
  const response = {
    scout: {
      ...scout,
      strengths: scout.strengths ? JSON.parse(scout.strengths) : [],
      weaknesses: scout.weaknesses ? JSON.parse(scout.weaknesses) : [],
    },
  }

  return reply.status(200).send(response)
}
