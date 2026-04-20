import type { Play } from '../../../../generated/prisma/client.js'
import type { PlayRepository } from '../../repositories/play-repository.js'

export class PlayNotFoundError extends Error {
  constructor() {
    super('Lance não encontrado.')
    this.name = 'PlayNotFoundError'
  }
}

interface Input {
  playId: string
  videoUrl: string
  thumbnailUrl?: string | null
}

export class UpdatePlayVideoUrlAdminUseCase {
  constructor(private playRepository: PlayRepository) {}

  async execute({ playId, videoUrl, thumbnailUrl }: Input): Promise<Play> {
    const existing = await this.playRepository.findById(playId)
    if (!existing) throw new PlayNotFoundError()

    return this.playRepository.updateVideoUrl(playId, videoUrl, thumbnailUrl)
  }
}
