import type { Match, Prisma } from '../../../generated/prisma/client.js'
import type { MatchRepository } from '../repositories/match-repository.js'
import type { ScoutRepository } from '../repositories/scout-repository.js'
import type { PlayRepository } from '../repositories/play-repository.js'
import type { AthleteProfileRepository } from '../repositories/athlete-profile-repository.js'
import { GenerateScoutUseCase } from './generate-scout.js'

interface UpdateMatchRequest {
  matchId: string
  userId: string
  updateData: Prisma.MatchUpdateInput
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

export class UpdateMatchUseCase {
  constructor(
    private matchRepository: MatchRepository,
    private athleteProfileRepository: AthleteProfileRepository,
    private scoutRepository?: ScoutRepository,
    private playRepository?: PlayRepository,
  ) {}

  async execute(request: UpdateMatchRequest): Promise<Match> {
    // Primeiro buscar o perfil de atleta do usuário
    const athleteProfile = await this.athleteProfileRepository.findByUserId(
      request.userId,
    )

    if (!athleteProfile) {
      throw new AthleteProfileNotFoundError()
    }

    // Verificar se a partida existe e pertence ao atleta
    const existingMatch = await this.matchRepository.findById(request.matchId)

    if (!existingMatch) {
      throw new MatchNotFoundError()
    }

    // Comparar com o ID do perfil de atleta, não com o ID do usuário
    if (existingMatch.athleteId !== athleteProfile.id) {
      throw new MatchNotBelongsToAthleteError()
    }

    const updatedMatch = await this.matchRepository.update(
      request.matchId,
      request.updateData,
    )

    // Se a partida foi finalizada (resultado diferente de NOT_FINISHED), gerar scout automaticamente
    if (
      request.updateData.result &&
      request.updateData.result !== 'NOT_FINISHED' &&
      this.scoutRepository &&
      this.playRepository
    ) {
      try {
        const generateScoutUseCase = new GenerateScoutUseCase(
          this.scoutRepository,
          this.playRepository,
        )

        await generateScoutUseCase.execute({
          matchId: request.matchId,
        })
      } catch (error) {
        // Log do erro mas não falha a atualização da partida
        console.error('Erro ao gerar scout automaticamente:', error)
      }
    }

    return updatedMatch
  }
}

export {
  MatchNotFoundError,
  MatchNotBelongsToAthleteError,
  AthleteProfileNotFoundError,
}
