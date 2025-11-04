import type { Match } from '../../../generated/prisma/client.js'
import type { MatchRepository } from '../repositories/match-repository.js'
import type { AthleteProfileRepository } from '../repositories/athlete-profile-repository.js'

interface ListMyMatchesRequest {
  userId: string
  includePlays?: boolean
  status?: 'FINISHED' | 'NOT_FINISHED' | 'ALL'
}

class AthleteProfileNotFoundError extends Error {
  constructor() {
    super(
      'Athlete profile not found. Please create your athlete profile first.',
    )
    this.name = 'AthleteProfileNotFoundError'
  }
}

export class ListMyMatchesUseCase {
  constructor(
    private matchRepository: MatchRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute(request: ListMyMatchesRequest): Promise<Match[]> {
    // Primeiro buscar o perfil de atleta do usuário
    const athleteProfile = await this.athleteProfileRepository.findByUserId(
      request.userId,
    )

    if (!athleteProfile) {
      throw new AthleteProfileNotFoundError()
    }

    // Buscar partidas usando o ID do perfil de atleta
    let matches: Match[]
    if (request.includePlays) {
      matches = await this.matchRepository.findByAthleteWithPlays(
        athleteProfile.id,
      )
    } else {
      matches = await this.matchRepository.findByAthlete(athleteProfile.id)
    }

    // Filtrar por status se especificado
    if (request.status && request.status !== 'ALL') {
      if (request.status === 'FINISHED') {
        matches = matches.filter((match) => match.result !== 'NOT_FINISHED')
      } else if (request.status === 'NOT_FINISHED') {
        matches = matches.filter((match) => match.result === 'NOT_FINISHED')
      }
    }

    return matches
  }
}

export { AthleteProfileNotFoundError }
