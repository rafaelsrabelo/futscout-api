import type {
  PlayClassification,
  PlayType,
} from '../../../generated/prisma/client.js'
import type {
  PlayRepository,
  PlayWithClassifications,
} from '../repositories/play-repository.js'
import type { MatchRepository } from '../repositories/match-repository.js'
import {
  MatchNotBelongsToAthleteError,
  MatchNotFoundError,
} from './get-match.js'

interface AddPlayToMatchRequest {
  matchId: string
  athleteProfileId: string
  playType: PlayType
  videoUrl?: string | null
  thumbnailUrl?: string | null
  photoUrl?: string | null
  rating?: number | null
  observations?: string | null
  classifications?: PlayClassification[]
}

export class AddPlayToMatchUseCase {
  constructor(
    private playRepository: PlayRepository,
    private matchRepository: MatchRepository,
  ) {}

  async execute(
    request: AddPlayToMatchRequest,
  ): Promise<PlayWithClassifications> {
    const match = await this.matchRepository.findById(request.matchId)

    if (!match) {
      throw new MatchNotFoundError()
    }

    if (match.athleteId !== request.athleteProfileId) {
      throw new MatchNotBelongsToAthleteError()
    }

    return this.playRepository.createWithClassifications({
      matchId: request.matchId,
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

export { MatchNotFoundError, MatchNotBelongsToAthleteError }
