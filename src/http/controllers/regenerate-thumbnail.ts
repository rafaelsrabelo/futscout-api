import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { CloudflareR2Service } from '../../lib/cloudflare-r2.js'
import { VideoThumbnailService } from '../../lib/video-thumbnail.js'

const regenerateThumbnailSchema = z.object({
  playId: z.string().uuid(),
})

/**
 * Regenera thumbnail para um play que não tem thumbnail
 * Útil para corrigir plays que falharam na geração inicial
 */
export async function regenerateThumbnail(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { playId } = regenerateThumbnailSchema.parse(request.params)


    // Buscar o play
    const play = await prisma.play.findUnique({
      where: { id: playId },
      select: {
        id: true,
        videoUrl: true,
        thumbnailUrl: true,
      },
    })

    if (!play) {
      return reply.status(404).send({
        message: 'Play não encontrado.',
      })
    }

    if (!play.videoUrl) {
      return reply.status(400).send({
        message: 'Play não tem vídeo para gerar thumbnail.',
      })
    }

    if (play.thumbnailUrl) {
      return reply.status(400).send({
        message: 'Play já tem thumbnail.',
        thumbnailUrl: play.thumbnailUrl,
      })
    }

    // Gerar thumbnail
    const thumbnailService = new VideoThumbnailService()
    const r2Service = new CloudflareR2Service()

    const thumbnailBuffer = await thumbnailService.generateThumbnailFromUrl(
      play.videoUrl,
      1,
    )

    if (!thumbnailBuffer || thumbnailBuffer.length === 0) {
      throw new Error('Thumbnail buffer está vazio')
    }

    // Extrair nome do arquivo do vídeo
    const videoFilename =
      play.videoUrl.split('/').pop() || `video_${Date.now()}.mp4`

    // Upload do thumbnail para R2
    const thumbnailResult = await r2Service.uploadThumbnail(
      thumbnailBuffer,
      videoFilename,
    )

    // Atualizar play com thumbnail
    const updatedPlay = await prisma.play.update({
      where: { id: playId },
      data: { thumbnailUrl: thumbnailResult.url },
    })


    return reply.status(200).send({
      message: 'Thumbnail regenerado com sucesso!',
      play: updatedPlay,
    })
  } catch (error) {
    console.error('❌ Erro ao regenerar thumbnail:', error)
    return reply.status(500).send({
      message: 'Erro ao regenerar thumbnail.',
      error:
        error instanceof Error ? error.message : 'Erro desconhecido',
    })
  }
}

