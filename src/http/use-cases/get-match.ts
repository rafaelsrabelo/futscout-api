import type { Match } from '../../../generated/prisma/client.js'
import type { AthleteProfileRepository } from '../repositories/athlete-profile-repository.js'
import type { MatchRepository } from '../repositories/match-repository.js'

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
    // Buscar a partida diretamente (partidas são públicas para visualização)
    const match = request.includePlays
      ? await this.matchRepository.findByIdWithPlays(request.matchId)
      : await this.matchRepository.findById(request.matchId)

    if (!match) {
      throw new MatchNotFoundError()
    }

    // Partidas são públicas - qualquer usuário autenticado pode visualizar
    // Apenas edição/deleção requerem que seja o dono
    return match
  }
}

export {
  MatchNotFoundError,
  MatchNotBelongsToAthleteError,
  AthleteProfileNotFoundError,
}
