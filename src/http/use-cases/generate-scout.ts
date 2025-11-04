import type { ScoutRepository } from '../repositories/scout-repository.js'
import type { PlayRepository } from '../repositories/play-repository.js'
import { PlayType, type Play } from '../../../generated/prisma/client.js'

interface GenerateScoutUseCaseRequest {
  matchId: string
}

interface GenerateScoutUseCaseResponse {
  scout: {
    id: string
    matchId: string
    totalPlays: number
    positiveActions: number
    negativeActions: number
    neutralActions: number
    goals: number
    assists: number
    saves: number
    defensiveActions: number
    tackles: number
    interceptions: number
    crosses: number
    dribbles: number
    fouls: number
    yellowCards: number
    redCards: number
    overallRating: number | null
    performanceNote: string | null
    strengths: string | null
    weaknesses: string | null
    generatedAt: Date
    updatedAt: Date
  }
}

interface PlayStats {
  totalPlays: number
  positiveActions: number
  negativeActions: number
  neutralActions: number
  goals: number
  assists: number
  saves: number
  defensiveActions: number
  tackles: number
  interceptions: number
  crosses: number
  dribbles: number
  fouls: number
  yellowCards: number
  redCards: number
}

export class GenerateScoutUseCase {
  constructor(
    private scoutRepository: ScoutRepository,
    private playRepository: PlayRepository,
  ) {}

  async execute({
    matchId,
  }: GenerateScoutUseCaseRequest): Promise<GenerateScoutUseCaseResponse> {
    // Buscar todos os plays da partida
    const plays = await this.playRepository.findManyByMatchId(matchId)

    // Inicializar contadores
    const stats: PlayStats = {
      totalPlays: plays.length,
      positiveActions: 0,
      negativeActions: 0,
      neutralActions: 0,
      goals: 0,
      assists: 0,
      saves: 0,
      defensiveActions: 0,
      tackles: 0,
      interceptions: 0,
      crosses: 0,
      dribbles: 0,
      fouls: 0,
      yellowCards: 0,
      redCards: 0,
    }

    // Calcular estatísticas baseadas nos plays
    plays.forEach((play: Play) => {
      // Contar por tipo de play
      switch (play.playType) {
        case PlayType.GOAL:
          stats.goals++
          stats.positiveActions++
          break
        case PlayType.ASSIST:
          stats.assists++
          stats.positiveActions++
          break
        case PlayType.DIFFICULT_SAVE:
        case PlayType.EASY_SAVE:
          stats.saves++
          stats.positiveActions++
          break
        case PlayType.PASS:
        case PlayType.KEY_PASS:
          stats.defensiveActions++
          stats.positiveActions++
          break
        case PlayType.TACKLE:
          stats.tackles++
          stats.positiveActions++
          break
        case PlayType.INTERCEPTION:
          stats.interceptions++
          stats.positiveActions++
          break
        case PlayType.CROSS:
          stats.crosses++
          stats.positiveActions++
          break
        case PlayType.DRIBBLE:
          stats.dribbles++
          stats.positiveActions++
          break
        case PlayType.FOUL_COMMITTED:
          stats.fouls++
          stats.negativeActions++
          break
        case PlayType.YELLOW_CARD:
          stats.yellowCards++
          stats.negativeActions++
          break
        case PlayType.RED_CARD:
          stats.redCards++
          stats.negativeActions++
          break
        default:
          // Avaliar por rating se disponível
          if (play.rating) {
            if (play.rating >= 4) {
              stats.positiveActions++
            } else if (play.rating <= 2) {
              stats.negativeActions++
            } else {
              stats.neutralActions++
            }
          } else {
            stats.neutralActions++
          }
      }
    })

    // Calcular rating geral baseado nas avaliações dos plays
    const ratedPlays = plays.filter((play) => play.rating !== null)
    const overallRating =
      ratedPlays.length > 0
        ? ratedPlays.reduce((sum, play) => sum + (play.rating || 0), 0) /
          ratedPlays.length
        : null

    // Gerar análise de pontos fortes e fracos
    const strengths = this.generateStrengths(stats)
    const weaknesses = this.generateWeaknesses(stats, plays)

    // Gerar nota de performance
    const performanceNote = this.generatePerformanceNote(stats, overallRating)

    // Verificar se já existe scout para esta partida
    const existingScout = await this.scoutRepository.findByMatchId(matchId)

    let scout
    if (existingScout) {
      // Atualizar scout existente
      scout = await this.scoutRepository.update(existingScout.id, {
        ...stats,
        overallRating,
        performanceNote,
        strengths: JSON.stringify(strengths),
        weaknesses: JSON.stringify(weaknesses),
      })
    } else {
      // Criar novo scout
      scout = await this.scoutRepository.create({
        matchId,
        ...stats,
        overallRating,
        performanceNote,
        strengths: JSON.stringify(strengths),
        weaknesses: JSON.stringify(weaknesses),
      })
    }

    return {
      scout,
    }
  }

  private generateStrengths(stats: PlayStats): string[] {
    const strengths: string[] = []

    if (stats.goals > 0) {
      strengths.push(`Capacidade de finalização: ${stats.goals} gol(s)`)
    }

    if (stats.assists > 0) {
      strengths.push(`Visão de jogo: ${stats.assists} assistência(s)`)
    }

    if (stats.saves > 2) {
      strengths.push(`Reflexos defensivos: ${stats.saves} defesa(s)`)
    }

    if (stats.positiveActions > stats.negativeActions * 2) {
      strengths.push('Consistência nas ações positivas')
    }

    if (stats.tackles > 1) {
      strengths.push(`Marcação efetiva: ${stats.tackles} desarme(s)`)
    }

    if (stats.interceptions > 1) {
      strengths.push(
        `Leitura de jogo: ${stats.interceptions} interceptação(ões)`,
      )
    }

    return strengths
  }

  private generateWeaknesses(stats: PlayStats, plays: Play[]): string[] {
    const weaknesses: string[] = []

    if (stats.fouls > 2) {
      weaknesses.push(`Indisciplina: ${stats.fouls} falta(s) cometida(s)`)
    }

    if (stats.yellowCards > 0) {
      weaknesses.push(`Cartões recebidos: ${stats.yellowCards} amarelo(s)`)
    }

    if (stats.redCards > 0) {
      weaknesses.push(`Expulsão: ${stats.redCards} cartão(ões) vermelho(s)`)
    }

    if (stats.negativeActions > stats.positiveActions) {
      weaknesses.push('Predominância de ações negativas')
    }

    const lowRatingPlays = plays.filter(
      (play) => play.rating && play.rating <= 2,
    )
    if (lowRatingPlays.length > plays.length * 0.3) {
      weaknesses.push('Muitas ações com baixa avaliação')
    }

    return weaknesses
  }

  private generatePerformanceNote(
    stats: PlayStats,
    overallRating: number | null,
  ): string {
    let note = 'Análise da performance:\n\n'

    if (overallRating) {
      if (overallRating >= 4) {
        note += '🌟 Excelente performance geral\n'
      } else if (overallRating >= 3) {
        note += '✅ Boa performance geral\n'
      } else if (overallRating >= 2) {
        note += '⚠️ Performance regular\n'
      } else {
        note += '❌ Performance abaixo do esperado\n'
      }
    }

    note += `\nResumo estatístico:\n`
    note += `• Total de ações: ${stats.totalPlays}\n`
    note += `• Ações positivas: ${stats.positiveActions}\n`
    note += `• Ações negativas: ${stats.negativeActions}\n`
    note += `• Ações neutras: ${stats.neutralActions}\n`

    if (stats.goals > 0) note += `• Gols: ${stats.goals}\n`
    if (stats.assists > 0) note += `• Assistências: ${stats.assists}\n`
    if (stats.saves > 0) note += `• Defesas: ${stats.saves}\n`

    return note
  }
}
