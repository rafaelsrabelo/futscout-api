import type {
  Category,
  Match,
  MatchResult,
  MatchStatus,
  Modality,
  PlayerPosition,
} from '../../../generated/prisma/client.js'
import type { AthleteProfileRepository } from '../repositories/athlete-profile-repository.js'
import type { CompetitionRepository } from '../repositories/competition-repository.js'
import type { MatchRepository } from '../repositories/match-repository.js'

interface CreateMatchRequest {
  athleteId: string
  myTeamId: string
  adversaryTeam: string
  date: Date
  modality?:
    | Modality // Opcional se competitionId for fornecido
    | undefined // Opcional se competitionId for fornecido
  category?:
    | Category // Opcional se competitionId for fornecido
    | undefined // Opcional se competitionId for fornecido
  location?:
    | string // Opcional se competitionId for fornecido
    | undefined // Opcional se competitionId for fornecido
  streamUrl?: string | null | undefined
  competitionId?:
    | string
    | null // Se null, é amistoso
    | undefined // Se null, é amistoso
  status?: MatchStatus | undefined
  result?: MatchResult | undefined
  myTeamScore?: number | null | undefined
  adversaryScore?: number | null | undefined
  playerPosition?: PlayerPosition | null | undefined
  observations?: string | null | undefined
  matchDuration?: number | null | undefined
  approximateTime?: number | null | undefined
  photoUrl?: string | null | undefined
  videoUrl?: string | null | undefined
  youtubeUrl?: string | null | undefined
  performanceRating?: number | null | undefined
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
    private competitionRepository?: CompetitionRepository,
  ) {}

  async execute(request: CreateMatchRequest): Promise<Match> {
    // Verificar se o atleta tem um perfil criado
    const athleteProfile = await this.athleteProfileRepository.findByUserId(
      request.athleteId,
    )

    if (!athleteProfile) {
      throw new AthleteProfileNotFoundError()
    }

    // Se competitionId for fornecido, buscar a competição para preencher campos faltantes
    let finalModality: Modality | undefined = request.modality
    let finalCategory: Category | undefined = request.category
    let finalLocation: string | undefined = request.location

    if (request.competitionId && this.competitionRepository) {
      const competition = await this.competitionRepository.findById(
        request.competitionId,
      )

      if (competition) {
        // Preencher com valores da competição se não foram fornecidos
        if (!finalModality && competition.modality) {
          finalModality = competition.modality
        }
        if (!finalCategory && competition.category) {
          finalCategory = competition.category
        }
        if (!finalLocation && competition.location) {
          finalLocation = competition.location
        }
      }
    }

    // Validar que os campos obrigatórios estão preenchidos
    if (!finalModality) {
      throw new Error(
        'modality is required. Provide it in the request or ensure the competition has a modality.',
      )
    }
    if (!finalCategory) {
      throw new Error(
        'category is required. Provide it in the request or ensure the competition has a category.',
      )
    }
    if (!finalLocation) {
      throw new Error(
        'location is required. Provide it in the request or ensure the competition has a location.',
      )
    }

    // Calcular o resultado automaticamente baseado no placar
    let calculatedResult: MatchResult = request.result || 'NOT_FINISHED'

    if (
      request.myTeamScore !== null &&
      request.myTeamScore !== undefined &&
      request.adversaryScore !== null &&
      request.adversaryScore !== undefined
    ) {
      if (request.myTeamScore > request.adversaryScore) {
        calculatedResult = 'WIN'
      } else if (request.myTeamScore < request.adversaryScore) {
        calculatedResult = 'LOSS'
      } else {
        calculatedResult = 'DRAW'
      }
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
      modality: finalModality,
      category: finalCategory,
      location: finalLocation,
      streamUrl: request.streamUrl ?? null,
      competition: request.competitionId
        ? {
            connect: { id: request.competitionId },
          }
        : undefined,
      status: request.status || 'SCHEDULED',
      result: calculatedResult,
      myTeamScore: request.myTeamScore ?? null,
      adversaryScore: request.adversaryScore ?? null,
      playerPosition: request.playerPosition ?? null,
      observations: request.observations ?? null,
      matchDuration: request.matchDuration ?? null,
      approximateTime: request.approximateTime ?? null,
      photoUrl: request.photoUrl ?? null,
      videoUrl: request.videoUrl ?? null,
      youtubeUrl: request.youtubeUrl ?? null,
      performanceRating: request.performanceRating ?? null,
    })

    return match
  }
}

export { AthleteProfileNotFoundError }
