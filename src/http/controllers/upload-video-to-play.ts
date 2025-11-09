import type { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { CloudflareR2Service } from '../../lib/cloudflare-r2.js'
import { prisma } from '../../lib/prisma.js'
import { verifyJwt } from '../middlewares/verify-jwt.js'

const uploadVideoToPlaySchema = z.object({
  playId: z.string().uuid(),
})

export async function uploadVideoToPlay(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    // Verificar autenticação
    await verifyJwt(request, reply)

    const { playId } = uploadVideoToPlaySchema.parse(request.params)

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
      },
    })

    if (!play) {
      return reply.status(404).send({
        message: 'Lance não encontrado.',
      })
    }

    // Verificar se o usuário é dono do lance
    if (play.match.athlete.userId !== request.user.sub) {
      return reply.status(403).send({
        message: 'Você não tem permissão para editar este lance.',
      })
    }

    // Processar upload do arquivo
    const data = await request.file()

    if (!data) {
      return reply.status(400).send({
        message: 'Nenhum arquivo foi enviado.',
      })
    }

    // Converter stream para buffer
    const chunks: Buffer[] = []
    for await (const chunk of data.file) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)
    const filename = data.filename || 'video.mp4'

    // Inicializar serviço R2
    const r2Service = new CloudflareR2Service()

    // Validar arquivo
    try {
      r2Service.validateVideo(buffer, filename)
    } catch (error) {
      return reply.status(400).send({
        message: error instanceof Error ? error.message : 'Arquivo inválido',
      })
    }

    // Upload para R2
    const uploadResult = await r2Service.uploadVideo(buffer, filename)

    // Remover vídeo antigo se existir
    if (play.videoUrl) {
      try {
        const oldFilename = play.videoUrl.split('/').pop()
        if (oldFilename) {
          await r2Service.deleteVideo(`videos/${oldFilename}`)
        }
      } catch (error) {
        console.warn('Erro ao deletar vídeo antigo:', error)
        // Não falhar o request se não conseguir deletar o antigo
      }
    }

    // Atualizar lance no banco
    const updatedPlay = await prisma.play.update({
      where: {
        id: playId,
      },
      data: {
        videoUrl: uploadResult.url,
      },
      include: {
        match: {
          select: {
            id: true,
            adversaryTeam: true,
            date: true,
          },
        },
      },
    })

    return reply.status(200).send({
      message: 'Vídeo adicionado ao lance com sucesso!',
      play: updatedPlay,
    })
  } catch (error) {
    console.error('Error uploading video to play:', error)

    if (error instanceof Error && error.message.includes('credentials')) {
      return reply.status(500).send({
        message: 'Serviço de upload não configurado corretamente.',
      })
    }

    return reply.status(500).send({
      message: 'Erro interno do servidor.',
    })
  }
}
