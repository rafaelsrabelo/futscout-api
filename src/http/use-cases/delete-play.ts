import { prisma } from '../../lib/prisma.js'
import type { AthleteProfileRepository } from '../repositories/athlete-profile-repository.js'
import type { PlayRepository } from '../repositories/play-repository.js'

interface DeletePlayRequest {
  playId: string
  userId: string
}

class PlayNotFoundError extends Error {
  constructor() {
    super('Play not found')
    this.name = 'PlayNotFoundError'
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

class PlayNotBelongsToAthleteError extends Error {
  constructor() {
    super('You can only delete your own plays')
    this.name = 'PlayNotBelongsToAthleteError'
  }
}

export class DeletePlayUseCase {
  constructor(
    private playRepository: PlayRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute(request: DeletePlayRequest): Promise<void> {
    // Buscar o perfil de atleta do usuário
    const athleteProfile = await this.athleteProfileRepository.findByUserId(
      request.userId,
    )

    if (!athleteProfile) {
      throw new AthleteProfileNotFoundError()
    }

    // Buscar o lance com relacionamentos para verificar propriedade
    const play = await prisma.play.findUnique({
      where: { id: request.playId },
      include: {
        match: {
          select: {
            id: true,
            athleteId: true,
          },
        },
        athlete: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!play) {
      throw new PlayNotFoundError()
    }

    // Verificar se o lance pertence ao atleta
    // Pode ser através da partida ou diretamente pelo athleteId
    let belongsToAthlete = false

    if (play.matchId && play.match) {
      // Lance com partida - verificar se a partida pertence ao atleta
      belongsToAthlete = play.match.athleteId === athleteProfile.id
    } else if (play.athleteId) {
      // Lance standalone - verificar diretamente pelo athleteId
      belongsToAthlete = play.athleteId === athleteProfile.id
    }

    if (!belongsToAthlete) {
      throw new PlayNotBelongsToAthleteError()
    }

    // Deletar o lance
    await this.playRepository.delete(request.playId)

    // Decrementar contador de uso se o play tinha vídeo
    if (play.videoUrl) {
      const now = new Date()
      const month = now.getMonth() + 1
      const year = now.getFullYear()

      // Determinar se é vídeo standalone ou de jogo
      if (play.matchId) {
        // Vídeo dentro de jogo
        const usage = await prisma.usage.findUnique({
          where: {
            userId_month_year: {
              userId: request.userId,
              month,
              year,
            },
          },
        })

        if (usage && usage.videosUsed > 0) {
          await prisma.usage.update({
            where: {
              userId_month_year: {
                userId: request.userId,
                month,
                year,
              },
            },
            data: {
              videosUsed: {
                decrement: 1,
              },
            },
          })
        }
      } else {
        // Vídeo standalone
        const usage = await prisma.usage.findUnique({
          where: {
            userId_month_year: {
              userId: request.userId,
              month,
              year,
            },
          },
        })

        if (usage && usage.standaloneVideosUsed > 0) {
          await prisma.usage.update({
            where: {
              userId_month_year: {
                userId: request.userId,
                month,
                year,
              },
            },
            data: {
              standaloneVideosUsed: {
                decrement: 1,
              },
            },
          })
        }
      }
    }
  }
}

export {
  PlayNotFoundError,
  AthleteProfileNotFoundError,
  PlayNotBelongsToAthleteError,
}
