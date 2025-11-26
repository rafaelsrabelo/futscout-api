import type { FastifyReply, FastifyRequest } from 'fastify'
import type { PlayClassification, PlayType } from 'generated/prisma/client.js'
import { z } from 'zod'
import { CloudflareR2Service } from '../../lib/cloudflare-r2.js'
import { prisma } from '../../lib/prisma.js'
import { VideoThumbnailService } from '../../lib/video-thumbnail.js'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaPlayRepository } from '../repositories/prisma/prisma-play-repository.js'
import { CreateStandalonePlayUseCase } from '../use-cases/create-standalone-play.js'
import { incrementVideoUsage } from '../utils/increment-usage.js'

/**
 * Cria um play com vídeo já no R2 (upload direto do frontend)
 * Backend NUNCA toca no vídeo - apenas recebe a URL final
 */
const createPlayWithVideoUrlSchema = z.object({
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
  video_url: z.string().url(), // URL do vídeo já no R2
  thumbnail_url: z.string().url().optional(), // Thumbnail (pode gerar depois)
  photo_url: z.string().url().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  observations: z.string().optional(),
  classifications: z
    .array(z.enum(['PHYSICAL', 'TACTICAL', 'MENTAL', 'TECHNICAL']))
    .optional(),
})

export async function createPlayWithVideoUrl(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  console.log('🎯 [ENDPOINT] /plays/with-url foi chamado!')
  console.log('🎯 [ENDPOINT] Request body:', JSON.stringify(request.body))

  try {
    const {
      play_type,
      video_url,
      thumbnail_url,
      photo_url,
      rating,
      observations,
      classifications,
    } = createPlayWithVideoUrlSchema.parse(request.body)

    console.log('💾 [PLAY] ==========================================')
    console.log('💾 [PLAY] Criando play com vídeo URL (upload direto)')
    console.log('💾 [PLAY] Play Type:', play_type)
    console.log('💾 [PLAY] Video URL:', video_url)
    console.log('💾 [PLAY] Has Thumbnail (enviado):', !!thumbnail_url)
    console.log('💾 [PLAY] ==========================================')

    const playRepository = new PrismaPlayRepository()
    const athleteProfileRepository = new PrismaAthleteProfileRepository()
    const createStandalonePlayUseCase = new CreateStandalonePlayUseCase(
      playRepository,
      athleteProfileRepository,
    )

    const play = await createStandalonePlayUseCase.execute({
      userId: request.user.sub,
      playType: play_type as PlayType,
      videoUrl: video_url,
      photoUrl: photo_url || null,
      thumbnailUrl: thumbnail_url || null,
      rating: rating || null,
      observations: observations || null,
      classifications: (classifications || []) as PlayClassification[],
    })

    // Incrementar contador de uso de vídeos
    await incrementVideoUsage(request.user.sub)

    console.log('✅ Play criado com sucesso (upload direto):', {
      id: play.id,
      videoUrl: play.videoUrl,
    })

    // Gerar thumbnail automaticamente de forma assíncrona (não bloqueia a resposta)
    console.log('🔍 [THUMBNAIL] Verificando condições para gerar thumbnail...')
    console.log('🔍 [THUMBNAIL] video_url existe?', !!video_url)
    console.log('🔍 [THUMBNAIL] thumbnail_url existe?', !!thumbnail_url)
    console.log(
      '🔍 [THUMBNAIL] Condição (video_url && !thumbnail_url):',
      !!(video_url && !thumbnail_url),
    )

    if (video_url && !thumbnail_url) {
      console.log('🔄 [THUMBNAIL] ==========================================')
      console.log('🔄 [THUMBNAIL] INICIANDO GERAÇÃO DE THUMBNAIL EM BACKGROUND')
      console.log('🔄 [THUMBNAIL] Play ID:', play.id)
      console.log('🔄 [THUMBNAIL] Video URL:', video_url)
      console.log('🔄 [THUMBNAIL] ==========================================')

      // Executar de forma não bloqueante mas garantida
      // Usar setTimeout com delay 0 para garantir execução após a resposta
      setTimeout(async () => {
        try {
          console.log(
            '🚀 [THUMBNAIL] setTimeout executado, iniciando generateThumbnailAsync...',
          )
          await generateThumbnailAsync(play.id, video_url)
          console.log(
            '✅ [THUMBNAIL] generateThumbnailAsync completou com sucesso',
          )
        } catch (error) {
          console.error(
            '❌ [CRITICAL] Erro ao gerar thumbnail em background:',
            {
              playId: play.id,
              videoUrl: video_url.substring(0, 100),
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            },
          )
          // Não falhar o request se o thumbnail falhar
        }
      }, 0)

      // Log adicional para confirmar que foi agendado
      console.log(
        '📅 [THUMBNAIL] Geração de thumbnail agendada para background (setTimeout)',
      )
    } else if (thumbnail_url) {
      console.log(
        '✅ [THUMBNAIL] Thumbnail já fornecido pelo frontend, pulando geração',
      )
    } else {
      console.log(
        '⚠️ [THUMBNAIL] Sem vídeo para gerar thumbnail (video_url não existe)',
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

    console.error('Error creating play with video URL:', error)
    return reply.status(500).send({
      message: 'Erro interno do servidor.',
    })
  }
}

/**
 * Gera thumbnail de forma assíncrona e atualiza o play
 * Não bloqueia a resposta do endpoint
 * Exportada para reutilização em outros controllers
 */
export async function generateThumbnailAsync(
  playId: string,
  videoUrl: string,
): Promise<void> {
  const startTime = Date.now()
  console.log('🚀 [THUMBNAIL] ==========================================')
  console.log('🚀 [THUMBNAIL] INICIANDO GERAÇÃO DE THUMBNAIL')
  console.log('🚀 [THUMBNAIL] Play ID:', playId)
  console.log('🚀 [THUMBNAIL] Video URL:', videoUrl)
  console.log('🚀 [THUMBNAIL] ==========================================')

  try {
    // Aguardar alguns segundos para garantir que o vídeo está disponível no R2
    // R2 pode levar alguns segundos para tornar o arquivo acessível após upload
    console.log(
      '⏳ [THUMBNAIL] Aguardando 3 segundos para garantir disponibilidade do vídeo no R2...',
    )
    await new Promise((resolve) => setTimeout(resolve, 3000))
    console.log('✅ [THUMBNAIL] Aguardou 3 segundos, tentando baixar vídeo...')

    console.log('🖼️ [THUMBNAIL] Iniciando geração para play:', playId)
    console.log('🖼️ [THUMBNAIL] Video URL:', videoUrl.substring(0, 100))

    const thumbnailService = new VideoThumbnailService()
    const r2Service = new CloudflareR2Service()

    // Gerar thumbnail a partir da URL do vídeo
    console.log('🖼️ [THUMBNAIL] Chamando generateThumbnailFromUrl...')
    const thumbnailBuffer = await thumbnailService.generateThumbnailFromUrl(
      videoUrl,
      1, // Frame no segundo 1
    )

    if (!thumbnailBuffer || thumbnailBuffer.length === 0) {
      throw new Error('Thumbnail buffer está vazio')
    }

    console.log(
      '🖼️ [THUMBNAIL] Thumbnail gerado, tamanho:',
      thumbnailBuffer.length,
      'bytes',
    )

    // Extrair nome do arquivo do vídeo para nomear o thumbnail
    const videoFilename = videoUrl.split('/').pop() || `video_${Date.now()}.mp4`
    console.log('🖼️ [THUMBNAIL] Fazendo upload do thumbnail para R2...')

    // Upload do thumbnail para R2
    const thumbnailResult = await r2Service.uploadThumbnail(
      thumbnailBuffer,
      videoFilename,
    )

    console.log(
      '🖼️ [THUMBNAIL] Thumbnail enviado para R2:',
      thumbnailResult.url,
    )

    // Atualizar play com thumbnail
    await prisma.play.update({
      where: { id: playId },
      data: { thumbnailUrl: thumbnailResult.url },
    })

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log('✅ [THUMBNAIL] ==========================================')
    console.log('✅ [THUMBNAIL] THUMBNAIL GERADO E SALVO COM SUCESSO!')
    console.log('✅ [THUMBNAIL] Play ID:', playId)
    console.log('✅ [THUMBNAIL] Thumbnail URL:', thumbnailResult.url)
    console.log('✅ [THUMBNAIL] Duração:', `${duration}s`)
    console.log('✅ [THUMBNAIL] ==========================================')
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.error('❌ [THUMBNAIL] ==========================================')
    console.error('❌ [THUMBNAIL] ERRO AO GERAR THUMBNAIL!')
    console.error('❌ [THUMBNAIL] Play ID:', playId)
    console.error('❌ [THUMBNAIL] Video URL:', videoUrl.substring(0, 100))
    console.error('❌ [THUMBNAIL] Duração até erro:', `${duration}s`)
    console.error(
      '❌ [THUMBNAIL] Erro:',
      error instanceof Error ? error.message : String(error),
    )
    if (error instanceof Error && error.stack) {
      console.error('❌ [THUMBNAIL] Stack:', error.stack)
    }
    console.error('❌ [THUMBNAIL] ==========================================')
    // Não lançar erro - apenas logar
    // O play já foi criado, então não é crítico se o thumbnail falhar
  }
}
