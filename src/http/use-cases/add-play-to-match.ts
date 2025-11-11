import type {
  Play,
  PlayType,
  PlayClassification,
} from '../../../generated/prisma/client.js'
import type { PlayRepository } from '../repositories/play-repository.js'
import type { MatchRepository } from '../repositories/match-repository.js'
import type { AthleteProfileRepository } from '../repositories/athlete-profile-repository.js'
import { prisma } from '../../lib/prisma.js'

interface AddPlayToMatchRequest {
  matchId: string
  userId: string
  playType: PlayType
  videoUrl?: string | null
  photoUrl?: string | null
  rating?: number | null
  approximateTime?: number | null
  observations?: string | null
  classifications?: PlayClassification[]
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

export class AddPlayToMatchUseCase {
  constructor(
    private playRepository: PlayRepository,
    private matchRepository: MatchRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute(request: AddPlayToMatchRequest): Promise<Play> {
    // Primeiro buscar o perfil de atleta do usuário
    const athleteProfile = await this.athleteProfileRepository.findByUserId(
      request.userId,
    )

    if (!athleteProfile) {
      throw new AthleteProfileNotFoundError()
    }

    // Verificar se a partida existe e pertence ao atleta
    const match = await this.matchRepository.findById(request.matchId)

    if (!match) {
      throw new MatchNotFoundError()
    }

    // Comparar com o ID do perfil de atleta, não com o ID do usuário
    if (match.athleteId !== athleteProfile.id) {
      throw new MatchNotBelongsToAthleteError()
    }

    // Usar transação para criar o play e suas classificações
    const play = await prisma.$transaction(async (tx) => {
      // Criar o play
      const createdPlay = await tx.play.create({
        data: {
          match: {
            connect: { id: request.matchId },
          },
          playType: request.playType,
          videoUrl: request.videoUrl ?? null,
          photoUrl: request.photoUrl ?? null,
          rating: request.rating ?? null,
          approximateTime: request.approximateTime ?? null,
          observations: request.observations ?? null,
        },
      })

      // Criar as classificações se fornecidas
      if (request.classifications && request.classifications.length > 0) {
        await tx.playClassifications.createMany({
          data: request.classifications.map((classification) => ({
            playId: createdPlay.id,
            classification,
          })),
        })
      }

      // Buscar o play com classificações para retornar
      return await tx.play.findUnique({
        where: { id: createdPlay.id },
        include: {
          classifications: true,
        },
      })
    })

    return play!
  }
}

export {
  MatchNotFoundError,
  MatchNotBelongsToAthleteError,
  AthleteProfileNotFoundError,
}
