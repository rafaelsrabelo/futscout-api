import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { GenerateAIScoutUseCase } from '../use-cases/generate-ai-scout.js'
import { PrismaScoutRepository } from '../repositories/prisma/prisma-scout-repository.js'
import { PrismaPlayRepository } from '../repositories/prisma/prisma-play-repository.js'
import { PrismaMatchRepository } from '../repositories/prisma/prisma-match-repository.js'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'

export async function generateAIScout(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const generateAIScoutParamsSchema = z.object({
    id: z.string().uuid(),
  })

  const { id: matchId } = generateAIScoutParamsSchema.parse(request.params)
  const userId = request.user.sub

  try {
    const scoutRepository = new PrismaScoutRepository()
    const playRepository = new PrismaPlayRepository()
    const matchRepository = new PrismaMatchRepository()
    const athleteProfileRepository = new PrismaAthleteProfileRepository()

    // Buscar perfil do atleta para pegar o ID
    const athleteProfile = await athleteProfileRepository.findByUserId(userId)
    if (!athleteProfile) {
      return reply.status(404).send({
        message: 'Athlete profile not found. Please create your profile first.',
      })
    }

    const generateAIScoutUseCase = new GenerateAIScoutUseCase(
      scoutRepository,
      playRepository,
      matchRepository,
      athleteProfileRepository,
    )

    const { scout } = await generateAIScoutUseCase.execute({
      matchId,
      athleteId: athleteProfile.id,
    })

    return reply.status(200).send({ scout })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Match not found') {
        return reply.status(404).send({ message: 'Match not found' })
      }
      if (error.message === 'Athlete profile not found') {
        return reply.status(404).send({ message: 'Athlete profile not found' })
      }
      if (error.message === 'OpenAI API key not configured') {
        return reply.status(503).send({
          message: 'AI analysis service not available',
        })
      }
      if (error.message === 'Failed to generate AI performance analysis') {
        return reply.status(503).send({
          message: 'Failed to generate AI analysis',
        })
      }
    }

    console.error('Error generating AI scout:', error)
    return reply.status(500).send({ message: 'Internal server error' })
  }
}
