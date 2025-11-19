import type {
  Play,
  PlayClassification,
  PlayType,
} from '../../../generated/prisma/client.js'
import { prisma } from '../../lib/prisma.js'
import type { AthleteProfileRepository } from '../repositories/athlete-profile-repository.js'
import type { PlayRepository } from '../repositories/play-repository.js'

interface CreateStandalonePlayRequest {
  userId: string
  playType: PlayType
  videoUrl?: string | null
  photoUrl?: string | null
  thumbnailUrl?: string | null
  rating?: number | null
  observations?: string | null
  classifications?: PlayClassification[]
}

class AthleteProfileNotFoundError extends Error {
  constructor() {
    super(
      'Athlete profile not found. Please create your athlete profile first.',
    )
    this.name = 'AthleteProfileNotFoundError'
  }
}

export class CreateStandalonePlayUseCase {
  constructor(
    private playRepository: PlayRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute(request: CreateStandalonePlayRequest): Promise<Play> {
    // Buscar o perfil de atleta do usuário
    const athleteProfile = await this.athleteProfileRepository.findByUserId(
      request.userId,
    )

    if (!athleteProfile) {
      throw new AthleteProfileNotFoundError()
    }

    // Usar transação para criar o play e suas classificações
    const play = await prisma.$transaction(async (tx) => {
      // Criar o play sem partida
      const createdPlay = await tx.play.create({
        data: {
          athlete: {
            connect: { id: athleteProfile.id },
          },
          playType: request.playType,
          videoUrl: request.videoUrl ?? null,
          photoUrl: request.photoUrl ?? null,
          thumbnailUrl: request.thumbnailUrl ?? null,
          rating: request.rating ?? null,
          observations: request.observations ?? null,
        },
      })

      // Criar as classificações se fornecidas
      if (request.classifications && request.classifications.length > 0) {
        // Garantir que cada classificação seja um valor válido do enum
        const validClassifications = request.classifications.filter(
          (c): c is PlayClassification =>
            c === 'PHYSICAL' ||
            c === 'TACTICAL' ||
            c === 'MENTAL' ||
            c === 'TECHNICAL',
        )

        if (validClassifications.length > 0) {
          await tx.playClassifications.createMany({
            data: validClassifications.map((classification) => ({
              playId: createdPlay.id,
              classification,
            })),
          })
        }
      }

      // Buscar o play com classificações para retornar
      return await tx.play.findUnique({
        where: { id: createdPlay.id },
        include: {
          classifications: true,
          athlete: {
            select: {
              id: true,
              nickname: true,
              profilePhoto: true,
            },
          },
        },
      })
    })

    if (!play) {
      throw new Error('Failed to create play')
    }

    return play
  }
}

export { AthleteProfileNotFoundError }

