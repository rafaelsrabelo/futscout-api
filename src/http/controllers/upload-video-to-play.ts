import { VideoCompressionService } from '@/lib/video-compression.js'
import { VideoThumbnailService } from '@/lib/video-thumbnail.js'
import type { FastifyReply, FastifyRequest } from 'fastify'
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
    if (!play.match || play.match.athlete.userId !== request.user.sub) {
      return reply.status(403).send({
        message: 'Você não tem permissão para editar este lance.',
      })
    }

    // Processar upload do arquivo usando STREAM verdadeiro
    // request.file() carrega tudo na memória ANTES de entregar o stream!
    // request.parts() com limites evita isso completamente
    const parts = request.parts({
      limits: {
        fileSize: 120 * 1024 * 1024, // 120MB limite real no servidor
      },
    })
    let videoPart: {
      file: NodeJS.ReadableStream
      filename?: string
    } | null = null

    // Buscar apenas a parte do vídeo
    for await (const part of parts) {
      if (part.type === 'file') {
        videoPart = {
          file: part.file,
          filename: part.filename,
        }
        break // Só processa o primeiro arquivo
      }
    }

    if (!videoPart) {
      return reply.status(400).send({
        message: 'Nenhum arquivo foi enviado.',
      })
    }

    // Usar streams ao invés de buffer (não carrega tudo na memória!)
    const { randomUUID } = await import('node:crypto')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const { unlink, stat } = await import('node:fs/promises')
    const { createWriteStream, createReadStream } = await import('node:fs')

    const videoId = randomUUID()
    const tempInputPath = join(tmpdir(), `${videoId}-input.mp4`)
    const filename = videoPart.filename || 'video.mp4'
    const r2Service = new CloudflareR2Service()

    // Salvar stream em arquivo temporário (não carrega na memória!)
    // Com proteção contra fechamento prematuro do stream
    const writeStream = createWriteStream(tempInputPath)
    videoPart.file.pipe(writeStream, { end: true })

    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => resolve())
      writeStream.on('error', reject)
      videoPart.file.on('error', reject)
    })

    // Validar tamanho do arquivo
    const fileStats = await stat(tempInputPath)
    if (fileStats.size > 100 * 1024 * 1024) {
      await unlink(tempInputPath).catch(() => {})
      return reply.status(413).send({
        message: 'Arquivo muito grande. O tamanho máximo permitido é 100MB.',
      })
    }

    // Comprimir vídeo usando streams
    // IMPORTANTE: Só comprime vídeos entre 20MB e 100MB para evitar estouro de memória
    let finalVideoPath = tempInputPath
    const fileSizeMB = fileStats.size / (1024 * 1024)

    if (fileSizeMB >= 20 && fileSizeMB <= 100) {
      try {
        console.log(`🗜️ Comprimindo vídeo (${fileSizeMB.toFixed(2)}MB)...`)
        const compressionService = new VideoCompressionService()
        const inputStream = createReadStream(tempInputPath)
        const compressedPath = await compressionService.compressVideoStream(
          inputStream,
          tempInputPath,
          {
            maxWidth: 720,
            maxHeight: 720,
            videoBitrate: '1M',
            audioBitrate: '64k',
            maxFramerate: 30,
            quality: 28,
            minSizeToCompress: 20 * 1024 * 1024,
          },
        )

        if (compressedPath) {
          await unlink(tempInputPath).catch(() => {})
          finalVideoPath = compressedPath
          console.log('✅ Vídeo comprimido com sucesso!')
        }
      } catch (error) {
        console.warn(
          '⚠️ Erro ao comprimir vídeo, usando original:',
          error instanceof Error ? error.message : error,
        )
      }
    } else {
      console.log(
        `ℹ️ Vídeo ${fileSizeMB.toFixed(2)}MB fora do range de compressão (20-100MB), usando original`,
      )
    }

    // Gerar thumbnail ANTES de fazer upload (usa arquivo diretamente, sem buffer!)
    let thumbnailUrl: string | null = null
    try {
      const thumbnailService = new VideoThumbnailService()
      // Usar caminho do arquivo diretamente - NÃO carrega vídeo na memória!
      const thumbnailBuffer = await thumbnailService.generateThumbnailFromFile(
        finalVideoPath,
        1,
      )
      const thumbnailResult = await r2Service.uploadThumbnail(
        thumbnailBuffer,
        filename,
      )
      thumbnailUrl = thumbnailResult.url
    } catch (error) {
      console.warn('Erro ao gerar thumbnail:', error)
    }

    // Upload usando stream (não carrega na memória!)
    const uploadStream = createReadStream(finalVideoPath)
    const uploadResult = await r2Service.uploadVideoFromStream(
      uploadStream,
      filename,
    )

    // Limpar arquivo temporário
    await unlink(finalVideoPath).catch(() => {})

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
        thumbnailUrl,
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
