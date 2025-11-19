import type { Competition, Prisma } from '../../../generated/prisma/client.js'
import type { AthleteProfileRepository } from '../repositories/athlete-profile-repository.js'
import type { CompetitionRepository } from '../repositories/competition-repository.js'

interface UpdateCompetitionRequest {
  competitionId: string
  userId: string
  name?: string
  description?: string | null
  startDate?: Date | null
  endDate?: Date | null
  location?: string | null
  modality?: string | null
  category?: string | null
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
    super('You can only update your own competitions')
    this.name = 'CompetitionNotBelongsToAthleteError'
  }
}

export class UpdateCompetitionUseCase {
  constructor(
    private competitionRepository: CompetitionRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute(request: UpdateCompetitionRequest): Promise<Competition> {
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

    // Preparar dados de atualização
    const updateData: Prisma.CompetitionUpdateInput = {}

    if (request.name !== undefined) {
      updateData.name = request.name
    }
    if (request.description !== undefined) {
      updateData.description = request.description
    }
    if (request.startDate !== undefined) {
      updateData.startDate = request.startDate
    }
    if (request.endDate !== undefined) {
      updateData.endDate = request.endDate
    }
    if (request.location !== undefined) {
      updateData.location = request.location
    }
    if (request.modality !== undefined) {
      updateData.modality = request.modality
    }
    if (request.category !== undefined) {
      updateData.category = request.category
    }

    const updatedCompetition = await this.competitionRepository.update(
      request.competitionId,
      updateData,
    )

    return updatedCompetition
  }
}

export {
  CompetitionNotFoundError,
  AthleteProfileNotFoundError,
  CompetitionNotBelongsToAthleteError,
}

