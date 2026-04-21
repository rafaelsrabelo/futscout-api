import type { Play } from '../../../../generated/prisma/client.js'
import type { PlayRepository } from '../../repositories/play-repository.js'
import { PlayNotFoundError } from './update-play-video-url.js'

interface Input {
  playId: string
}

export class RemovePlayVideoAdminUseCase {
  constructor(private playRepository: PlayRepository) {}

  async execute({ playId }: Input): Promise<Play> {
    const existing = await this.playRepository.findById(playId)
    if (!existing) throw new PlayNotFoundError()

    return this.playRepository.clearVideo(playId)
  }
}

export { PlayNotFoundError }
