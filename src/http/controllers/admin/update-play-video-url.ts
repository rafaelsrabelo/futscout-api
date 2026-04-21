import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaPlayRepository } from '../../repositories/prisma/prisma-play-repository.js'
import {
  PlayNotFoundError,
  UpdatePlayVideoUrlAdminUseCase,
} from '../../use-cases/admin/update-play-video-url.js'
import { generateThumbnailAsync } from '../create-play-with-video-url.js'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const bodySchema = z.object({
  videoUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
})

export async function updatePlayVideoUrlAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = paramsSchema.parse(request.params)
  const { videoUrl, thumbnailUrl } = bodySchema.parse(request.body)

  const playRepository = new PrismaPlayRepository()
  const useCase = new UpdatePlayVideoUrlAdminUseCase(playRepository)

  try {
    const play = await useCase.execute({
      playId: id,
      videoUrl,
      thumbnailUrl: thumbnailUrl ?? null,
    })

    if (!thumbnailUrl) {
      setTimeout(() => {
        generateThumbnailAsync(play.id, videoUrl).catch((error) => {
          console.error('[ADMIN][THUMBNAIL] background generation failed:', {
            playId: play.id,
            error: error instanceof Error ? error.message : String(error),
          })
        })
      }, 0)
    }

    return reply.status(200).send(play)
  } catch (error) {
    if (error instanceof PlayNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}
