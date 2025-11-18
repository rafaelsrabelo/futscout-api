import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'

export async function getVideoFeed(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const videoFeedQuerySchema = z.object({
      page: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val) : 1)),
      limit: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val) : 20)),
    })

    const { page, limit } = videoFeedQuerySchema.parse(request.query)
    const skip = (page - 1) * limit

    // Buscar o perfil do atleta
    const athleteProfile = await prisma.athleteProfile.findUnique({
      where: { userId: request.user.sub },
    })

    if (!athleteProfile) {
      return reply.status(404).send({
        message: 'Perfil de atleta não encontrado.',
      })
    }

    // Buscar todos os lances com vídeo do atleta, ordenado por data mais recente
    const videoPlays = await prisma.play.findMany({
      where: {
        videoUrl: { not: null },
        match: {
          athleteId: athleteProfile.id,
        },
      },
      select: {
        id: true,
        videoUrl: true,
        thumbnailUrl: true,
        classifications: true,
        match: {
          select: {
            id: true,
            adversaryTeam: true,
            myTeam: true,
            date: true,
            modality: true,
            category: true,
            location: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    })

    // Contar total para paginação
    const totalVideos = await prisma.play.count({
      where: {
        videoUrl: { not: null },
        match: {
          athleteId: athleteProfile.id,
        },
      },
    })

    const totalPages = Math.ceil(totalVideos / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    return reply.send({
      videos: videoPlays,
      pagination: {
        currentPage: page,
        totalPages,
        totalVideos,
        hasNextPage,
        hasPrevPage,
        limit,
      },
    })
  } catch (error) {
    console.error('Error fetching video feed:', error)
    return reply.status(500).send({
      message: 'Erro interno do servidor.',
    })
  }
}
