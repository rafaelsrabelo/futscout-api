import type { Match } from '../../../generated/prisma/client.js'
import type { MatchRepository } from '../repositories/match-repository.js'
import type { AthleteProfileRepository } from '../repositories/athlete-profile-repository.js'

interface ListMyMatchesRequest {
  userId: string
  includePlays?: boolean
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
    if (request.includePlays) {
      return this.matchRepository.findByAthleteWithPlays(athleteProfile.id)
    }

    return this.matchRepository.findByAthlete(athleteProfile.id)
  }
}

export { AthleteProfileNotFoundError }
