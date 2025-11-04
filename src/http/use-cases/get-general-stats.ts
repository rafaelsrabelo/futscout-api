import type { MatchRepository } from '../repositories/match-repository.js'
import type { PlayRepository } from '../repositories/play-repository.js'
import type { AthleteProfileRepository } from '../repositories/athlete-profile-repository.js'
import {
  GeneralStatsCalculator,
  type GeneralStatsResponse,
} from './general-stats.js'

interface GetGeneralStatsRequest {
  userId: string
}

class AthleteProfileNotFoundError extends Error {
  constructor() {
    super(
      'Athlete profile not found. Please create your athlete profile first.',
    )
    this.name = 'AthleteProfileNotFoundError'
  }
}

export class GetGeneralStatsUseCase {
  constructor(
    private matchRepository: MatchRepository,
    private playRepository: PlayRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute(
    request: GetGeneralStatsRequest,
  ): Promise<GeneralStatsResponse> {
    // Primeiro buscar o perfil de atleta do usuário
    const athleteProfile = await this.athleteProfileRepository.findByUserId(
      request.userId,
    )

    if (!athleteProfile) {
      throw new AthleteProfileNotFoundError()
    }

    // Buscar todas as partidas do atleta
    const matches = await this.matchRepository.findByAthlete(athleteProfile.id)

    // Buscar todos os plays de todas as partidas
    const matchIds = matches.map((match) => match.id)
    const allPlays = []

    for (const matchId of matchIds) {
      const plays = await this.playRepository.findManyByMatchId(matchId)
      allPlays.push(...plays)
    }

    // Calcular estatísticas gerais
    const stats = GeneralStatsCalculator.calculate(matches, allPlays)

    return stats
  }
}

export { AthleteProfileNotFoundError }
