import type { FastifyReply, FastifyRequest } from 'fastify'
import type { PlayClassification, PlayType } from 'generated/prisma/client.js'
import { z } from 'zod'
import { CloudflareR2Service } from '../../lib/cloudflare-r2.js'
import { VideoCompressionService } from '../../lib/video-compression.js'
import { VideoThumbnailService } from '../../lib/video-thumbnail.js'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaPlayRepository } from '../repositories/prisma/prisma-play-repository.js'
import { CreateStandalonePlayUseCase } from '../use-cases/create-standalone-play.js'
import {
  incrementStandaloneVideoUsage,
} from '../utils/increment-usage.js'

export async function createStandalonePlay(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    // Verificar se é multipart (upload de arquivo) ou JSON (URLs)
    const contentType = request.headers['content-type'] || ''
    const isMultipart = contentType.includes('multipart/form-data')

    console.log('📦 Content-Type:', contentType)
    console.log('📦 Is Multipart:', isMultipart)

    let playType: string
    let videoUrl: string | null = null
    let photoUrl: string | null = null
    let thumbnailUrl: string | null = null
    let rating: number | null = null
    let observations: string | null = null
    let classifications: string[] = []

    if (isMultipart) {
      // Processar multipart/form-data usando STREAM verdadeiro
      // request.file() carrega tudo na memória ANTES de entregar o stream!
      // request.parts() com limites evita isso completamente
      const parts = request.parts({
        limits: {
          fileSize: 120 * 1024 * 1024, // 120MB limite real no servidor
          files: 1, // Apenas 1 arquivo por request
          fields: 20, // Limite de campos de formulário
          fieldSize: 2 * 1024 * 1024, // 2MB máximo por campo (evita campos gigantes)
        },
      })
      const formData: Record<string, string | number | null> = {}

      for await (const part of parts) {
        if (part.type === 'file') {
          if (part.fieldname === 'video') {
            console.log('🎥 Processando upload de vídeo...')
            const { randomUUID } = await import('node:crypto')
            const { tmpdir } = await import('node:os')
            const { join } = await import('node:path')
            const { unlink, stat } = await import('node:fs/promises')
            const { createWriteStream, createReadStream } = await import(
              'node:fs'
            )

            const videoId = randomUUID()
            const tempInputPath = join(tmpdir(), `${videoId}-input.mp4`)
            const r2Service = new CloudflareR2Service()

            // Validar MIME type ANTES de salvar
            const allowedMimeTypes = [
              'video/mp4',
              'video/quicktime',
              'video/x-msvideo',
              'video/x-ms-wmv',
              'video/webm',
              'video/x-matroska',
            ]
            if (
              part.mimetype &&
              !allowedMimeTypes.includes(part.mimetype.toLowerCase())
            ) {
              return reply.status(400).send({
                message:
                  'Formato de vídeo inválido. Formatos aceitos: MP4, MOV, AVI, WMV, WebM, MKV.',
              })
            }

            // Salvar stream em arquivo usando pipeline (garante backpressure e fechamento correto)
            const { pipeline } = await import('node:stream/promises')
            const writeStream = createWriteStream(tempInputPath)

            // Timeout de 3 minutos para upload
            request.socket.setTimeout(3 * 60 * 1000)

            await pipeline(part.file, writeStream)
            writeStream.close() // Garante flush completo

            // Validar arquivo (lê apenas metadados, não o arquivo inteiro)
            const fileStats = await stat(tempInputPath)
            const filename = part.filename || 'video.mp4'
            const fileSizeMB = fileStats.size / (1024 * 1024)
            console.log(
              `📊 Arquivo recebido: ${filename} (${fileSizeMB.toFixed(2)}MB)`,
            )

            if (fileStats.size > 100 * 1024 * 1024) {
              await unlink(tempInputPath).catch(() => {})
              return reply.status(413).send({
                message:
                  'Arquivo muito grande. O tamanho máximo permitido é 100MB.',
              })
            }

            // Comprimir vídeo usando streams (não carrega na memória!)
            // IMPORTANTE: Comprime vídeos entre 30MB e 90MB (vídeos de celular de 1 minuto geralmente são 60-100MB)
            // Usa configurações muito conservadoras para evitar estouro de memória
            let finalVideoPath = tempInputPath

            if (fileSizeMB >= 30 && fileSizeMB <= 90) {
              try {
                console.log(
                  `🗜️ Comprimindo vídeo (${fileSizeMB.toFixed(2)}MB)...`,
                )
                const compressionService = new VideoCompressionService()
                // Usar arquivo diretamente (já está salvo em disco, não precisa de stream)
                const compressedPath =
                  await compressionService.compressVideoFile(tempInputPath, {
                    maxWidth: 720,
                    maxHeight: 720,
                    videoBitrate: '1M',
                    audioBitrate: '64k',
                    maxFramerate: 30,
                    quality: 28,
                    minSizeToCompress: 30 * 1024 * 1024,
                  })

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
                // Continua com o vídeo original
              }
            } else {
              console.log(
                `ℹ️ Vídeo ${fileSizeMB.toFixed(2)}MB fora do range de compressão (30-90MB), usando original`,
              )
            }

            // Gerar thumbnail ANTES de fazer upload (usa arquivo diretamente, sem buffer!)
            let thumbnailUrl: string | null = null
            try {
              console.log('🖼️ Gerando thumbnail...')
              const thumbnailService = new VideoThumbnailService()
              // Usar caminho do arquivo diretamente - NÃO carrega vídeo na memória!
              const thumbnailBuffer =
                await thumbnailService.generateThumbnailFromFile(
                  finalVideoPath,
                  1,
                )
              const thumbnailResult = await r2Service.uploadThumbnail(
                thumbnailBuffer,
                filename,
              )
              thumbnailUrl = thumbnailResult.url
              console.log('✅ Thumbnail gerado:', thumbnailUrl)
            } catch (error) {
              console.warn(
                '⚠️ Não foi possível gerar thumbnail:',
                error instanceof Error ? error.message : error,
              )
            }

            // Upload usando stream (não carrega na memória!)
            console.time('upload-to-r2')
            const uploadStream = createReadStream(finalVideoPath)
            const uploadResult = await r2Service.uploadVideoFromStream(
              uploadStream,
              filename,
            )
            console.timeEnd('upload-to-r2')
            videoUrl = uploadResult.url
            const finalSizeMB =
              (await stat(finalVideoPath)).size / (1024 * 1024)
            console.log(
              `✅ Vídeo enviado: ${videoUrl} (${finalSizeMB.toFixed(2)}MB)`,
            )

            // Limpar arquivos temporários
            await unlink(finalVideoPath).catch(() => {})
            if (finalVideoPath !== tempInputPath) {
              await unlink(tempInputPath).catch(() => {})
            }
          } else if (part.fieldname === 'photo') {
            // Processar foto (similar ao vídeo, mas sem compressão)
            const chunks: Buffer[] = []
            for await (const chunk of part.file) {
              chunks.push(chunk)
            }
            const buffer = Buffer.concat(chunks)
            const r2Service = new CloudflareR2Service()
            const { url } = await r2Service.uploadImage(
              buffer,
              part.filename || 'photo.jpg',
            )
            photoUrl = url
          }
        } else {
          // Campo de formulário
          formData[part.fieldname] = part.value as string | number | null
        }
      }

      // Extrair campos do form
      playType = (formData.play_type as string) || ''

      if (formData.rating) {
        rating = Number.parseInt(formData.rating as string, 10)
      }

      if (formData.observations) {
        observations = formData.observations as string
      }

      if (formData.classifications) {
        try {
          let parsed: string | string[] = String(formData.classifications)

          // Tentar parsear se for string JSON
          if (typeof formData.classifications === 'string') {
            try {
              parsed = JSON.parse(formData.classifications)
            } catch {
              // Se não for JSON, usar como string simples
              parsed = formData.classifications
            }
          }

          // Normalizar para array
          const array = Array.isArray(parsed) ? parsed : [parsed]

          // Filtrar apenas valores válidos do enum
          const validClassifications = [
            'PHYSICAL',
            'TACTICAL',
            'MENTAL',
            'TECHNICAL',
          ]
          classifications = array.filter((c) =>
            validClassifications.includes(String(c)),
          ) as string[]
        } catch (error) {
          console.warn('Erro ao processar classifications:', error)
          classifications = []
        }
      }
    } else {
      // Processar JSON (URLs)
      const createStandalonePlayBodySchema = z.object({
        play_type: z.enum([
          'GOAL',
          'DIFFICULT_SAVE',
          'EASY_SAVE',
          'ASSIST',
          'FOUL_COMMITTED',
          'FOUL_RECEIVED',
          'DRIBBLE',
          'ANTICIPATION',
          'LONG_PASS',
          'FREE_KICK',
          'YELLOW_CARD',
          'RED_CARD',
          'RIGHT_FOOT_SHOT',
          'LEFT_FOOT_SHOT',
          'HEADER',
          'TACKLE',
          'INTERCEPTION',
          'CROSS',
          'CORNER_KICK',
          'PENALTY',
          'PASS',
          'KEY_PASS',
          'PENALTY_SAVE',
          'ONE_ON_ONE_SAVE',
          'REFLEX_SAVE',
          'DIVING_SAVE',
          'CATCH',
          'PUNCH',
          'DISTRIBUTION',
          'GOAL_KICK',
          'THROW_OUT',
          'SHOT_BLOCKED',
          'CLEARANCE',
          'OFFENSIVE_FOUL',
          'DEFENSIVE_FOUL',
          'BALL_RECOVERY',
          'THROUGH_PASS',
          'BACKHEEL',
          'VOLLLEY',
          'BICYCLE_KICK',
          'OFFSIDE',
          'MISSED_SHOT',
          'SHOT_ON_TARGET',
          'SHOT_OFF_TARGET',
          'BEST_MOMENTS',
        ]),
        video_url: z.string().url().optional(),
        photo_url: z.string().url().optional(),
        thumbnail_url: z.string().url().optional(),
        rating: z.number().int().min(1).max(5).optional(),
        observations: z.string().optional(),
        classifications: z
          .array(z.enum(['PHYSICAL', 'TACTICAL', 'MENTAL', 'TECHNICAL']))
          .optional(),
      })

      const parsed = createStandalonePlayBodySchema.parse(request.body)
      playType = parsed.play_type
      videoUrl = parsed.video_url || null
      photoUrl = parsed.photo_url || null
      thumbnailUrl = parsed.thumbnail_url || null
      rating = parsed.rating || null
      observations = parsed.observations || null
      classifications = parsed.classifications || []
    }

    // Validar playType
    const validPlayTypes = [
      'GOAL',
      'DIFFICULT_SAVE',
      'EASY_SAVE',
      'ASSIST',
      'FOUL_COMMITTED',
      'FOUL_RECEIVED',
      'DRIBBLE',
      'ANTICIPATION',
      'LONG_PASS',
      'FREE_KICK',
      'YELLOW_CARD',
      'RED_CARD',
      'RIGHT_FOOT_SHOT',
      'LEFT_FOOT_SHOT',
      'HEADER',
      'TACKLE',
      'INTERCEPTION',
      'CROSS',
      'CORNER_KICK',
      'PENALTY',
      'PASS',
      'KEY_PASS',
      'PENALTY_SAVE',
      'ONE_ON_ONE_SAVE',
      'REFLEX_SAVE',
      'DIVING_SAVE',
      'CATCH',
      'PUNCH',
      'DISTRIBUTION',
      'GOAL_KICK',
      'THROW_OUT',
      'SHOT_BLOCKED',
      'CLEARANCE',
      'OFFENSIVE_FOUL',
      'DEFENSIVE_FOUL',
      'BALL_RECOVERY',
      'THROUGH_PASS',
      'BACKHEEL',
      'VOLLLEY',
      'BICYCLE_KICK',
      'OFFSIDE',
      'MISSED_SHOT',
      'SHOT_ON_TARGET',
      'SHOT_OFF_TARGET',
      'BEST_MOMENTS',
    ]

    if (!playType || !validPlayTypes.includes(playType)) {
      return reply.status(400).send({
        message: 'play_type é obrigatório e deve ser um tipo válido',
      })
    }

    const playRepository = new PrismaPlayRepository()
    const athleteProfileRepository = new PrismaAthleteProfileRepository()
    const createStandalonePlayUseCase = new CreateStandalonePlayUseCase(
      playRepository,
      athleteProfileRepository,
    )

    console.log('💾 Salvando lance:', {
      playType,
      videoUrl,
      photoUrl,
      thumbnailUrl,
      hasVideo: !!videoUrl,
      hasThumbnail: !!thumbnailUrl,
    })

    const play = await createStandalonePlayUseCase.execute({
      userId: request.user.sub,
      playType: playType as PlayType,
      videoUrl,
      photoUrl,
      thumbnailUrl,
      rating,
      observations,
      classifications: classifications as PlayClassification[],
    })

    // Incrementar contador de uso de vídeos standalone se houver vídeo
    if (play.videoUrl) {
      await incrementStandaloneVideoUsage(request.user.sub)
    }

    console.log('✅ Lance criado com sucesso:', {
      id: play.id,
      videoUrl: play.videoUrl,
      thumbnailUrl: play.thumbnailUrl,
    })

    // Gerar thumbnail automaticamente se vídeo foi enviado via JSON (upload direto) e não tem thumbnail
    if (videoUrl && !thumbnailUrl && !isMultipart) {
      console.log(
        '🔄 [THUMBNAIL] Vídeo enviado via JSON (upload direto), gerando thumbnail em background...',
      )
      console.log('🔄 [THUMBNAIL] Play ID:', play.id)
      console.log('🔄 [THUMBNAIL] Video URL:', videoUrl)

      // Importar função de geração de thumbnail
      const { generateThumbnailAsync } = await import(
        './create-play-with-video-url.js'
      )

      // Executar em background
      setTimeout(async () => {
        try {
          console.log(
            '🚀 [THUMBNAIL] setTimeout executado, iniciando generateThumbnailAsync...',
          )
          await generateThumbnailAsync(play.id, videoUrl)
          console.log(
            '✅ [THUMBNAIL] generateThumbnailAsync completou com sucesso',
          )
        } catch (error) {
          console.error(
            '❌ [CRITICAL] Erro ao gerar thumbnail em background:',
            {
              playId: play.id,
              videoUrl: videoUrl.substring(0, 100),
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            },
          )
        }
      }, 0)

      console.log(
        '📅 [THUMBNAIL] Geração de thumbnail agendada para background',
      )
    }

    return reply.status(201).send({ play })
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === 'AthleteProfileNotFoundError'
    ) {
      return reply.status(404).send({
        message: error.message,
      })
    }

    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        message: 'Validation error',
        issues: error.format(),
      })
    }

    // Tratar erro de arquivo muito grande
    if (
      error instanceof Error &&
      (error.message.includes('file too large') ||
        error.message.includes('request file too large'))
    ) {
      return reply.status(413).send({
        message: 'Arquivo muito grande. O tamanho máximo permitido é 100MB.',
      })
    }

    console.error('Error creating standalone play:', error)
    return reply.status(500).send({
      message: 'Erro interno do servidor.',
    })
  }
}
