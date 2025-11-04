import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { PrismaScoutRepository } from '../repositories/prisma/prisma-scout-repository.js'

export async function getScout(request: FastifyRequest, reply: FastifyReply) {
  const getScoutParamsSchema = z.object({
    id: z.string().uuid(),
  })

  const { id } = getScoutParamsSchema.parse(request.params)

  const scoutRepository = new PrismaScoutRepository()

  const scout = await scoutRepository.findByMatchId(id)

  if (!scout) {
    return reply.status(404).send({
      message: 'Scout não encontrado para esta partida',
    })
  }

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
