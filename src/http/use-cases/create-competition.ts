import type { Competition, Prisma } from '../../../generated/prisma/client.js'
import type { AthleteProfileRepository } from '../repositories/athlete-profile-repository.js'
import type { CompetitionRepository } from '../repositories/competition-repository.js'

interface CreateCompetitionRequest {
  userId: string
  name: string
  description?: string | null
  startDate?: Date | null
  endDate?: Date | null
  location?: string | null
  modality?: string | null
  category?: string | null
}

class AthleteProfileNotFoundError extends Error {
  constructor() {
    super(
      'Athlete profile not found. Please create your athlete profile first.',
    )
    this.name = 'AthleteProfileNotFoundError'
  }
}

export class CreateCompetitionUseCase {
  constructor(
    private competitionRepository: CompetitionRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute(request: CreateCompetitionRequest): Promise<Competition> {
    // Buscar o perfil de atleta do usuário
    const athleteProfile = await this.athleteProfileRepository.findByUserId(
      request.userId,
    )

    if (!athleteProfile) {
      throw new AthleteProfileNotFoundError()
    }

    const competition = await this.competitionRepository.create({
      athlete: {
        connect: { id: athleteProfile.id },
      },
      name: request.name,
      description: request.description ?? null,
      startDate: request.startDate ?? null,
      endDate: request.endDate ?? null,
      location: request.location ?? null,
      modality: request.modality ?? null,
      category: request.category ?? null,
    })

    return competition
  }
}

export { AthleteProfileNotFoundError }

