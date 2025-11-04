import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { GenerateScoutByPositionUseCase } from '../use-cases/generate-scout-by-position.js'
import { PrismaScoutRepository } from '../repositories/prisma/prisma-scout-repository.js'
import { PrismaPlayRepository } from '../repositories/prisma/prisma-play-repository.js'
import { PrismaMatchRepository } from '../repositories/prisma/prisma-match-repository.js'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'

export async function generateScoutByPosition(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const generateScoutByPositionParamsSchema = z.object({
      matchId: z.string().uuid(),
    })

    const { matchId } = generateScoutByPositionParamsSchema.parse(
      request.params,
    )
    const userId = request.user.sub

    // Buscar o atleta através do userId
    const athleteProfileRepository = new PrismaAthleteProfileRepository()
    const athleteProfile = await athleteProfileRepository.findByUserId(userId)

    if (!athleteProfile) {
      return reply.status(404).send({
        message: 'Athlete profile not found',
      })
    }

    const scoutRepository = new PrismaScoutRepository()
    const playRepository = new PrismaPlayRepository()
    const matchRepository = new PrismaMatchRepository()

    const generateScoutByPositionUseCase = new GenerateScoutByPositionUseCase(
      scoutRepository,
      playRepository,
      matchRepository,
      athleteProfileRepository,
    )

    const { scout } = await generateScoutByPositionUseCase.execute({
      matchId,
      athleteId: athleteProfile.id,
    })

    return reply.status(200).send({
      scout: {
        ...scout,
        strengths: scout.strengths ? JSON.parse(scout.strengths) : [],
        weaknesses: scout.weaknesses ? JSON.parse(scout.weaknesses) : [],
      },
    })
  } catch (error) {
    console.error('Erro ao gerar scout por posição:', error)

    if (error instanceof Error) {
      if (error.name === 'MatchNotFoundError') {
        return reply.status(404).send({
          message: 'Match not found or does not belong to this athlete',
        })
      }

      if (error.name === 'AthleteNotFoundError') {
        return reply.status(404).send({
          message: 'Athlete profile not found',
        })
      }
    }

    return reply.status(500).send({
      message: 'Internal server error',
    })
  }
}
