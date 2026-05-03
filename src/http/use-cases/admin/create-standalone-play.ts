import type {
  PlayClassification,
  PlayType,
} from '../../../../generated/prisma/client.js'
import type { AthleteProfileRepository } from '../../repositories/athlete-profile-repository.js'
import type {
  PlayRepository,
  PlayWithClassifications,
} from '../../repositories/play-repository.js'

import { AthleteNotFoundError } from './errors/athlete-not-found-error.js'

export interface CreateStandalonePlayAdminUseCaseRequest {
  athleteProfileId: string
  playType: PlayType
  videoUrl?: string | null
  thumbnailUrl?: string | null
  photoUrl?: string | null
  rating?: number | null
  observations?: string | null
  classifications?: PlayClassification[]
}

export class CreateStandalonePlayAdminUseCase {
  constructor(
    private playRepository: PlayRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute(
    request: CreateStandalonePlayAdminUseCaseRequest,
  ): Promise<PlayWithClassifications> {
    const athlete = await this.athleteProfileRepository.findById(
      request.athleteProfileId,
    )
    if (!athlete) throw new AthleteNotFoundError()

    return this.playRepository.createStandaloneWithClassifications({
      athleteId: request.athleteProfileId,
      playType: request.playType,
      videoUrl: request.videoUrl ?? null,
      thumbnailUrl: request.thumbnailUrl ?? null,
      photoUrl: request.photoUrl ?? null,
      rating: request.rating ?? null,
      observations: request.observations ?? null,
      classifications: request.classifications ?? [],
    })
  }
}

export { AthleteNotFoundError }
