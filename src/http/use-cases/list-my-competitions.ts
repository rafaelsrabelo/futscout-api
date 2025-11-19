import type { Competition } from '../../../generated/prisma/client.js'
import type { AthleteProfileRepository } from '../repositories/athlete-profile-repository.js'
import type { CompetitionRepository } from '../repositories/competition-repository.js'

interface ListMyCompetitionsRequest {
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

export class ListMyCompetitionsUseCase {
  constructor(
    private competitionRepository: CompetitionRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute(request: ListMyCompetitionsRequest): Promise<Competition[]> {
    // Buscar o perfil de atleta do usuário
    const athleteProfile = await this.athleteProfileRepository.findByUserId(
      request.userId,
    )

    if (!athleteProfile) {
      throw new AthleteProfileNotFoundError()
    }

    // Buscar competições do atleta
    const competitions = await this.competitionRepository.findByAthleteId(
      athleteProfile.id,
    )

    return competitions
  }
}

export { AthleteProfileNotFoundError }

