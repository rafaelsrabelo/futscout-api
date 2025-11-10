import type {
  Match,
  Modality,
  Category,
  MatchResult,
  MatchStatus,
  PlayerPosition,
} from '../../../generated/prisma/client.js'
import type { MatchRepository } from '../repositories/match-repository.js'
import type { AthleteProfileRepository } from '../repositories/athlete-profile-repository.js'

interface CreateMatchRequest {
  athleteId: string
  myTeamId: string
  adversaryTeam: string
  date: Date
  modality: Modality
  category: Category
  location: string
  streamUrl?: string | null
  status?: MatchStatus
  result?: MatchResult
  myTeamScore?: number | null
  adversaryScore?: number | null
  playerPosition: PlayerPosition
  observations?: string | null
  approximateTime?: number | null
  photoUrl?: string | null
  videoUrl?: string | null
  performanceRating?: number | null
}

class AthleteProfileNotFoundError extends Error {
  constructor() {
    super(
      'Athlete profile not found. Please create your athlete profile first.',
    )
    this.name = 'AthleteProfileNotFoundError'
  }
}

export class CreateMatchUseCase {
  constructor(
    private matchRepository: MatchRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute(request: CreateMatchRequest): Promise<Match> {
    // Verificar se o atleta tem um perfil criado
    const athleteProfile = await this.athleteProfileRepository.findByUserId(
      request.athleteId,
    )

    if (!athleteProfile) {
      throw new AthleteProfileNotFoundError()
    }

    const match = await this.matchRepository.create({
      athlete: {
        connect: { id: athleteProfile.id },
      },
      myTeam: {
        connect: { id: request.myTeamId },
      },
      adversaryTeam: request.adversaryTeam,
      date: request.date,
      modality: request.modality,
      category: request.category,
      location: request.location,
      streamUrl: request.streamUrl ?? null,
      status: request.status || 'SCHEDULED',
      result: request.result || 'NOT_FINISHED',
      myTeamScore: request.myTeamScore ?? null,
      adversaryScore: request.adversaryScore ?? null,
      playerPosition: request.playerPosition,
      observations: request.observations ?? null,
      approximateTime: request.approximateTime ?? null,
      photoUrl: request.photoUrl ?? null,
      videoUrl: request.videoUrl ?? null,
      performanceRating: request.performanceRating ?? null,
    })

    return match
  }
}

export { AthleteProfileNotFoundError }
