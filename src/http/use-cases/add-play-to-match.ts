import type { Play, PlayType } from '../../../generated/prisma/client.js'
import type { PlayRepository } from '../repositories/play-repository.js'
import type { MatchRepository } from '../repositories/match-repository.js'
import type { AthleteProfileRepository } from '../repositories/athlete-profile-repository.js'

interface AddPlayToMatchRequest {
  matchId: string
  userId: string
  playType: PlayType
  videoUrl?: string | null
  photoUrl?: string | null
  rating?: number | null
  approximateTime?: number | null
  observations?: string | null
}

class MatchNotFoundError extends Error {
  constructor() {
    super('Match not found')
    this.name = 'MatchNotFoundError'
  }
}

class MatchNotBelongsToAthleteError extends Error {
  constructor() {
    super('Match does not belong to this athlete')
    this.name = 'MatchNotBelongsToAthleteError'
  }
}

class AthleteProfileNotFoundError extends Error {
  constructor() {
    super(
      'Athlete profile not found. Please create your athlete profile first.',
    )
    this.name = 'AthleteProfileNotFoundError'
  }
}

export class AddPlayToMatchUseCase {
  constructor(
    private playRepository: PlayRepository,
    private matchRepository: MatchRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute(request: AddPlayToMatchRequest): Promise<Play> {
    // Primeiro buscar o perfil de atleta do usuário
    const athleteProfile = await this.athleteProfileRepository.findByUserId(
      request.userId,
    )

    if (!athleteProfile) {
      throw new AthleteProfileNotFoundError()
    }

    // Verificar se a partida existe e pertence ao atleta
    const match = await this.matchRepository.findById(request.matchId)

    if (!match) {
      throw new MatchNotFoundError()
    }

    // Comparar com o ID do perfil de atleta, não com o ID do usuário
    if (match.athleteId !== athleteProfile.id) {
      throw new MatchNotBelongsToAthleteError()
    }

    const play = await this.playRepository.create({
      match: {
        connect: { id: request.matchId },
      },
      playType: request.playType,
      videoUrl: request.videoUrl ?? null,
      photoUrl: request.photoUrl ?? null,
      rating: request.rating ?? null,
      approximateTime: request.approximateTime ?? null,
      observations: request.observations ?? null,
    })

    return play
  }
}

export {
  MatchNotFoundError,
  MatchNotBelongsToAthleteError,
  AthleteProfileNotFoundError,
}
