import { VideoThumbnailService } from '@/lib/video-thumbnail.js'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { CloudflareR2Service } from '../../lib/cloudflare-r2.js'
import { prisma } from '../../lib/prisma.js'
import { verifyJwt } from '../middlewares/verify-jwt.js'

const updatePlayVideoUrlSchema = z.object({
  playId: z.string().uuid(),
})

const updatePlayVideoUrlBodySchema = z.object({
  video_url: z.string().url(),
  thumbnail_url: z.string().url().optional(),
})

export async function updatePlayVideoUrl(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    // Verificar autenticação
    await verifyJwt(request, reply)

    const { playId } = updatePlayVideoUrlSchema.parse(request.params)
    const { video_url, thumbnail_url } = updatePlayVideoUrlBodySchema.parse(
      request.body,
    )

    // Verificar se o lance existe e pertence ao usuário
    const play = await prisma.play.findUnique({
      where: {
        id: playId,
      },
      include: {
        match: {
          include: {
            athlete: true,
          },
        },
        athlete: true,
      },
    })

    if (!play) {
      return reply.status(404).send({
        message: 'Lance não encontrado.',
      })
    }

    // Verificar se o usuário é dono do lance
    const userId = request.user.sub
    const isOwner =
      (play.match && play.match.athlete.userId === userId) ||
      (play.athlete && play.athlete.userId === userId)

    if (!isOwner) {
      return reply.status(403).send({
        message: 'Você não tem permissão para editar este lance.',
      })
    }

    // Remover vídeo antigo se existir
    if (play.videoUrl) {
      try {
        const r2Service = new CloudflareR2Service()
        const oldFilename = play.videoUrl.split('/').pop()
        if (oldFilename) {
          await r2Service.deleteVideo(`videos/${oldFilename}`)
        }
      } catch (error) {
        console.warn('Erro ao deletar vídeo antigo:', error)
        // Não falhar o request se não conseguir deletar o antigo
      }
    }

    // Se não foi enviado thumbnail_url, tentar gerar automaticamente
    let finalThumbnailUrl = thumbnail_url || null
    if (!thumbnail_url && video_url) {
      try {
        console.log('🖼️ Gerando thumbnail automaticamente para o vídeo...')
        const thumbnailService = new VideoThumbnailService()
        const r2Service = new CloudflareR2Service()

        // Gerar thumbnail a partir da URL do vídeo
        const thumbnailBuffer = await thumbnailService.generateThumbnailFromUrl(
          video_url,
          1,
        )

        // Extrair nome do arquivo da URL
        const filename = video_url.split('/').pop() || 'video.mp4'
        const thumbnailResult = await r2Service.uploadThumbnail(
          thumbnailBuffer,
          filename,
        )
        finalThumbnailUrl = thumbnailResult.url
        console.log('✅ Thumbnail gerado com sucesso:', finalThumbnailUrl)
      } catch (error) {
        console.warn('⚠️ Erro ao gerar thumbnail automaticamente:', error)
        // Continua sem thumbnail se falhar
      }
    }

    // Atualizar lance no banco
    const updatedPlay = await prisma.play.update({
      where: {
        id: playId,
      },
      data: {
        videoUrl: video_url,
        thumbnailUrl: finalThumbnailUrl,
      },
      include: {
        match: {
          select: {
            id: true,
            adversaryTeam: true,
            date: true,
          },
        },
        athlete: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    })

    return reply.status(200).send({
      message: 'Vídeo atualizado no lance com sucesso!',
      play: updatedPlay,
    })
  } catch (error) {
    console.error('Error updating play video URL:', error)

    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        message: 'Dados inválidos.',
        errors: error.format(),
      })
    }

    return reply.status(500).send({
      message: 'Erro interno do servidor.',
    })
  }
}
