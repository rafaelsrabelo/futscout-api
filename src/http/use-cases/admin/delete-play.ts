import type { PlayRepository } from '../../repositories/play-repository.js'
import { PlayNotFoundError } from './update-play-video-url.js'

interface Input {
  playId: string
}

export class DeletePlayAdminUseCase {
  constructor(private playRepository: PlayRepository) {}

  async execute({ playId }: Input): Promise<void> {
    const existing = await this.playRepository.findById(playId)
    if (!existing) throw new PlayNotFoundError()

    await this.playRepository.delete(playId)
  }
}

export { PlayNotFoundError }
