import type { AthleteProfileRepository } from '../repositories/athlete-profile-repository.js'
import type { CompetitionRepository } from '../repositories/competition-repository.js'

interface DeleteCompetitionRequest {
  competitionId: string
  userId: string
}

class CompetitionNotFoundError extends Error {
  constructor() {
    super('Competition not found')
    this.name = 'CompetitionNotFoundError'
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

class CompetitionNotBelongsToAthleteError extends Error {
  constructor() {
    super('You can only delete your own competitions')
    this.name = 'CompetitionNotBelongsToAthleteError'
  }
}

export class DeleteCompetitionUseCase {
  constructor(
    private competitionRepository: CompetitionRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute(request: DeleteCompetitionRequest): Promise<void> {
    // Buscar o perfil de atleta do usuário
    const athleteProfile = await this.athleteProfileRepository.findByUserId(
      request.userId,
    )

    if (!athleteProfile) {
      throw new AthleteProfileNotFoundError()
    }

    // Verificar se a competição existe
    const competition = await this.competitionRepository.findById(
      request.competitionId,
    )

    if (!competition) {
      throw new CompetitionNotFoundError()
    }

    // Verificar se a competição pertence ao atleta
    if (competition.athleteId !== athleteProfile.id) {
      throw new CompetitionNotBelongsToAthleteError()
    }

    // Deletar a competição
    await this.competitionRepository.delete(request.competitionId)
  }
}

export {
  CompetitionNotFoundError,
  AthleteProfileNotFoundError,
  CompetitionNotBelongsToAthleteError,
}

