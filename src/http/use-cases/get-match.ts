import type { Match } from '../../../generated/prisma/client.js'
import type { MatchRepository } from '../repositories/match-repository.js'
import type { AthleteProfileRepository } from '../repositories/athlete-profile-repository.js'

interface GetMatchRequest {
  matchId: string
  userId: string
  includePlays?: boolean
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

export class GetMatchUseCase {
  constructor(
    private matchRepository: MatchRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute(request: GetMatchRequest): Promise<Match> {
    // Primeiro buscar o perfil de atleta do usuário
    const athleteProfile = await this.athleteProfileRepository.findByUserId(
      request.userId,
    )

    if (!athleteProfile) {
      throw new AthleteProfileNotFoundError()
    }

    const match = request.includePlays
      ? await this.matchRepository.findByIdWithPlays(request.matchId)
      : await this.matchRepository.findById(request.matchId)

    if (!match) {
      throw new MatchNotFoundError()
    }

    // Comparar com o ID do perfil de atleta, não com o ID do usuário
    if (match.athleteId !== athleteProfile.id) {
      throw new MatchNotBelongsToAthleteError()
    }

    return match
  }
}

export {
  MatchNotFoundError,
  MatchNotBelongsToAthleteError,
  AthleteProfileNotFoundError,
}
