import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { CloudflareR2Service } from '../../lib/cloudflare-r2.js'
import { VideoThumbnailService } from '../../lib/video-thumbnail.js'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaPlayRepository } from '../repositories/prisma/prisma-play-repository.js'
import { CreateStandalonePlayUseCase } from '../use-cases/create-standalone-play.js'

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
      // Processar multipart/form-data
      const parts = request.parts()
      const formData: Record<string, any> = {}

      for await (const part of parts) {
        if (part.type === 'file') {
          // Arquivo (vídeo ou foto)
          const chunks: Buffer[] = []
          for await (const chunk of part.file) {
            chunks.push(chunk)
          }
          const buffer = Buffer.concat(chunks)

          if (part.fieldname === 'video') {
            console.log('🎥 Processando upload de vídeo...')
            const r2Service = new CloudflareR2Service()
            r2Service.validateVideo(buffer, part.filename || 'video.mp4')

            const uploadResult = await r2Service.uploadVideo(
              buffer,
              part.filename || 'video.mp4',
            )
            videoUrl = uploadResult.url
            console.log('✅ Vídeo enviado:', videoUrl)

            // Gerar thumbnail do vídeo
            try {
              console.log('🖼️ Gerando thumbnail...')
              const thumbnailService = new VideoThumbnailService()
              const thumbnailBuffer = await thumbnailService.generateThumbnail(
                buffer,
                1,
              )
              const thumbnailResult = await r2Service.uploadThumbnail(
                thumbnailBuffer,
                part.filename || 'video.mp4',
              )
              thumbnailUrl = thumbnailResult.url
              console.log('✅ Thumbnail gerado:', thumbnailUrl)
            } catch (error) {
              console.error('❌ Erro ao gerar thumbnail:', error)
            }
          } else if (part.fieldname === 'photo') {
            const r2Service = new CloudflareR2Service()
            const { url } = await r2Service.uploadImage(
              buffer,
              part.filename || 'photo.jpg',
            )
            photoUrl = url
          }
        } else {
          // Campo de formulário
          formData[part.fieldname] = part.value
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
          let parsed: string | string[] = formData.classifications

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
      playType: playType as any,
      videoUrl,
      photoUrl,
      thumbnailUrl,
      rating,
      observations,
      classifications: classifications as any,
    })

    console.log('✅ Lance criado com sucesso:', {
      id: play.id,
      videoUrl: play.videoUrl,
      thumbnailUrl: play.thumbnailUrl,
    })

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

    console.error('Error creating standalone play:', error)
    return reply.status(500).send({
      message: 'Erro interno do servidor.',
    })
  }
}
