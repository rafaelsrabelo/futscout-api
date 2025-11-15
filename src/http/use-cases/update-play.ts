import type {
  Play,
  PlayClassification,
  PlayType,
} from '../../../generated/prisma/client.js'
import type { PlayRepository } from '../repositories/play-repository.js'
import { prisma } from '../../lib/prisma.js'

interface UpdatePlayRequest {
  playId: string
  playType?: PlayType
  rating?: number
  observations?: string
  classifications?: PlayClassification[]
}

interface UpdatePlayResponse {
  play: Play
}

export class UpdatePlayUseCase {
  constructor(private playRepository: PlayRepository) {}

  async execute({
    playId,
    playType,
    rating,
    observations,
    classifications,
  }: UpdatePlayRequest): Promise<UpdatePlayResponse> {
    // Verifica se o play existe
    const existingPlay = await this.playRepository.findById(playId)
    if (!existingPlay) {
      throw new Error('Play not found')
    }

    // Se classifications foram fornecidas, usa transação para atualizar
    if (classifications && classifications.length > 0) {
      const updatedPlay = await prisma.$transaction(async (tx) => {
        // Atualiza os dados básicos do play
        await tx.play.update({
          where: { id: playId },
          data: {
            ...(playType && { playType }),
            ...(rating && { rating }),
            ...(observations && { observations }),
          },
        })

        // Remove classifications existentes
        await tx.playClassifications.deleteMany({
          where: { playId },
        })

        // Adiciona novas classifications
        await tx.playClassifications.createMany({
          data: classifications.map((classification) => ({
            playId,
            classification,
          })),
        })

        // Busca o play completo com classifications
        return await tx.play.findUnique({
          where: { id: playId },
          include: {
            classifications: true,
          },
        })
      })

      if (!updatedPlay) {
        throw new Error('Failed to update play')
      }

      return { play: updatedPlay }
    } else {
      // Se não há classifications, apenas atualiza os dados básicos
      await this.playRepository.update(playId, {
        ...(playType && { playType }),
        ...(rating && { rating }),
        ...(observations && { observations }),
      })

      // Busca o play completo com classifications existentes
      const playWithClassifications = await this.playRepository.findById(playId)

      return { play: playWithClassifications! }
    }
  }
}
