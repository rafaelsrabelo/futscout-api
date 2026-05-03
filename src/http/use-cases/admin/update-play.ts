import type {
  PlayClassification,
  PlayType,
} from '../../../../generated/prisma/client.js'
import type {
  PlayRepository,
  PlayWithClassifications,
} from '../../repositories/play-repository.js'

import { PlayNotFoundError } from './errors/play-not-found-error.js'

export interface UpdatePlayAdminUseCaseRequest {
  playId: string
  playType?: PlayType
  rating?: number | null
  observations?: string | null
  photoUrl?: string | null
  thumbnailUrl?: string | null
  classifications?: PlayClassification[]
}

export class UpdatePlayAdminUseCase {
  constructor(private playRepository: PlayRepository) {}

  async execute(
    request: UpdatePlayAdminUseCaseRequest,
  ): Promise<PlayWithClassifications> {
    const existing = await this.playRepository.findById(request.playId)
    if (!existing) throw new PlayNotFoundError()

    return this.playRepository.updateMetadata(request.playId, {
      playType: request.playType,
      rating: request.rating,
      observations: request.observations,
      photoUrl: request.photoUrl,
      thumbnailUrl: request.thumbnailUrl,
      classifications: request.classifications,
    })
  }
}

export { PlayNotFoundError }
