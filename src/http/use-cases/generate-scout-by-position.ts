import type { ScoutRepository } from '../repositories/scout-repository.js'
import type { PlayRepository } from '../repositories/play-repository.js'
import type { MatchRepository } from '../repositories/match-repository.js'
import type { AthleteProfileRepository } from '../repositories/athlete-profile-repository.js'
import {
  PlayType,
  type Play,
  type Position,
} from '../../../generated/prisma/client.js'

interface GenerateScoutByPositionUseCaseRequest {
  matchId: string
  athleteId: string
}

interface GenerateScoutByPositionUseCaseResponse {
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

class MatchNotFoundError extends Error {
  constructor() {
    super('Match not found')
    this.name = 'MatchNotFoundError'
  }
}

class AthleteNotFoundError extends Error {
  constructor() {
    super('Athlete profile not found')
    this.name = 'AthleteNotFoundError'
  }
}

export class GenerateScoutByPositionUseCase {
  constructor(
    private scoutRepository: ScoutRepository,
    private playRepository: PlayRepository,
    private matchRepository: MatchRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute({
    matchId,
    athleteId,
  }: GenerateScoutByPositionUseCaseRequest): Promise<GenerateScoutByPositionUseCaseResponse> {
    // Verificar se a partida existe e pertence ao atleta
    const match = await this.matchRepository.findById(matchId)
    if (!match || match.athleteId !== athleteId) {
      throw new MatchNotFoundError()
    }

    // Buscar o perfil do atleta para obter a posição
    const athleteProfile =
      await this.athleteProfileRepository.findById(athleteId)
    if (!athleteProfile) {
      throw new AthleteNotFoundError()
    }

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

    // Usar a posição principal do atleta
    const position = athleteProfile.primaryPosition

    // Gerar análise de pontos fortes e fracos baseado na posição
    const strengths = this.generateStrengthsByPosition(stats, plays, position)
    const weaknesses = this.generateWeaknessesByPosition(stats, plays, position)

    // Gerar nota de performance baseada na posição
    const performanceNote = this.generatePerformanceNoteByPosition(
      stats,
      overallRating,
      position,
    )

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

  private generateStrengthsByPosition(
    stats: PlayStats,
    plays: Play[],
    position: Position,
  ): string[] {
    const strengths: string[] = []

    switch (position) {
      case 'GOALKEEPER':
        if (stats.saves > 2) {
          strengths.push(`🥅 Excelentes reflexos: ${stats.saves} defesa(s)`)
        }
        if (stats.saves > 0 && stats.goals === 0) {
          strengths.push('🛡️ Segurança defensiva: não sofreu gols')
        }
        if (stats.saves >= stats.goals) {
          strengths.push('✅ Mais defesas que gols sofridos')
        }
        break

      case 'DEFENDER':
        if (stats.tackles > 2) {
          strengths.push(`⚔️ Marcação efetiva: ${stats.tackles} desarme(s)`)
        }
        if (stats.interceptions > 1) {
          strengths.push(
            `👁️ Leitura de jogo: ${stats.interceptions} interceptação(ões)`,
          )
        }
        if (stats.defensiveActions > stats.negativeActions) {
          strengths.push('🛡️ Solidez defensiva')
        }
        if (stats.goals > 0) {
          strengths.push(`⚽ Contribuição ofensiva: ${stats.goals} gol(s)`)
        }
        break

      case 'MIDFIELDER':
        if (stats.assists > 0) {
          strengths.push(`🎯 Criatividade: ${stats.assists} assistência(s)`)
        }
        if (stats.crosses > 1) {
          strengths.push(`📐 Qualidade nos cruzamentos: ${stats.crosses}`)
        }
        if (stats.tackles > 0 && stats.assists > 0) {
          strengths.push('⚡ Versatilidade: contribui no ataque e defesa')
        }
        if (stats.dribbles > 1) {
          strengths.push(
            `🏃 Habilidade individual: ${stats.dribbles} drible(s)`,
          )
        }
        break

      case 'FORWARD':
        if (stats.goals > 0) {
          strengths.push(`⚽ Capacidade de finalização: ${stats.goals} gol(s)`)
        }
        if (stats.assists > 0) {
          strengths.push(
            `🎯 Participação ofensiva: ${stats.assists} assistência(s)`,
          )
        }
        if (stats.dribbles > 1) {
          strengths.push(
            `🏃 Habilidade individual: ${stats.dribbles} drible(s)`,
          )
        }
        if (stats.goals > 0 && stats.assists > 0) {
          strengths.push('🌟 Completo no ataque: gols e assistências')
        }
        break

      default:
        // Análise genérica
        if (stats.goals > 0) {
          strengths.push(`⚽ Capacidade de finalização: ${stats.goals} gol(s)`)
        }
        if (stats.assists > 0) {
          strengths.push(`🎯 Visão de jogo: ${stats.assists} assistência(s)`)
        }
    }

    if (stats.positiveActions > stats.negativeActions * 2) {
      strengths.push('✅ Consistência nas ações positivas')
    }

    return strengths
  }

  private generateWeaknessesByPosition(
    stats: PlayStats,
    plays: Play[],
    position: Position,
  ): string[] {
    const weaknesses: string[] = []

    // Fraquezas universais
    if (stats.fouls > 2) {
      weaknesses.push(`⚠️ Indisciplina: ${stats.fouls} falta(s) cometida(s)`)
    }

    if (stats.yellowCards > 0) {
      weaknesses.push(`🟨 Cartões recebidos: ${stats.yellowCards} amarelo(s)`)
    }

    if (stats.redCards > 0) {
      weaknesses.push(`🟥 Expulsão: ${stats.redCards} cartão(ões) vermelho(s)`)
    }

    // Fraquezas específicas por posição
    switch (position) {
      case 'GOALKEEPER':
        if (stats.goals > 2) {
          weaknesses.push('😟 Dificuldades defensivas: muitos gols sofridos')
        }
        if (stats.saves === 0 && stats.goals > 0) {
          weaknesses.push('❌ Falta de defesas importantes')
        }
        if (stats.goals > stats.saves) {
          weaknesses.push('⚠️ Mais gols sofridos que defesas')
        }
        break

      case 'DEFENDER':
        if (stats.tackles === 0 && stats.interceptions === 0) {
          weaknesses.push('😴 Poucas ações defensivas efetivas')
        }
        if (stats.goals > 0 && stats.defensiveActions < 2) {
          weaknesses.push('🚨 Vulnerabilidade defensiva')
        }
        if (stats.fouls > stats.tackles) {
          weaknesses.push('⚠️ Mais faltas que desarmes')
        }
        break

      case 'MIDFIELDER':
        if (stats.assists === 0 && stats.crosses === 0) {
          weaknesses.push('🎯 Falta de criatividade ofensiva')
        }
        if (stats.tackles === 0 && stats.interceptions === 0) {
          weaknesses.push('🛡️ Pouca contribuição defensiva')
        }
        if (stats.assists === 0 && stats.goals === 0) {
          weaknesses.push('📊 Baixa participação em gols')
        }
        break

      case 'FORWARD':
        if (stats.goals === 0) {
          weaknesses.push('⚽ Falta de efetividade na finalização')
        }
        if (stats.goals === 0 && stats.assists === 0) {
          weaknesses.push('📊 Baixa participação ofensiva')
        }
        if (stats.dribbles === 0) {
          weaknesses.push('🏃 Falta de criação individual')
        }
        break
    }

    if (stats.negativeActions > stats.positiveActions) {
      weaknesses.push('❌ Predominância de ações negativas')
    }

    const lowRatingPlays = plays.filter(
      (play) => play.rating && play.rating <= 2,
    )
    if (lowRatingPlays.length > plays.length * 0.3) {
      weaknesses.push('📉 Muitas ações com baixa avaliação')
    }

    return weaknesses
  }

  private generatePerformanceNoteByPosition(
    stats: PlayStats,
    overallRating: number | null,
    position: Position,
  ): string {
    let note = `📊 Análise da performance - ${this.getPositionName(position)}\n\n`

    if (overallRating) {
      if (overallRating >= 4.5) {
        note += '🌟 Performance excepcional\n'
      } else if (overallRating >= 4) {
        note += '✨ Excelente performance\n'
      } else if (overallRating >= 3) {
        note += '✅ Boa performance\n'
      } else if (overallRating >= 2) {
        note += '⚠️ Performance regular\n'
      } else {
        note += '❌ Performance abaixo do esperado\n'
      }
    }

    note += `\n📈 Estatísticas específicas para ${this.getPositionName(position)}:\n`

    // Estatísticas específicas por posição
    switch (position) {
      case 'GOALKEEPER': {
        note += `🥅 Defesas realizadas: ${stats.saves}\n`
        note += `⚽ Gols sofridos: ${stats.goals}\n`
        if (stats.goals === 0) note += `🛡️ Clean sheet ✅\n`
        const savePercentage =
          stats.saves + stats.goals > 0
            ? ((stats.saves / (stats.saves + stats.goals)) * 100).toFixed(1)
            : '0'
        note += `📊 Taxa de defesas: ${savePercentage}%\n`
        break
      }

      case 'DEFENDER':
        note += `⚔️ Desarmes: ${stats.tackles}\n`
        note += `👁️ Interceptações: ${stats.interceptions}\n`
        note += `🛡️ Ações defensivas: ${stats.defensiveActions}\n`
        if (stats.goals > 0) note += `⚽ Gols marcados: ${stats.goals}\n`
        break

      case 'MIDFIELDER':
        note += `🎯 Assistências: ${stats.assists}\n`
        note += `📐 Cruzamentos: ${stats.crosses}\n`
        note += `⚔️ Desarmes: ${stats.tackles}\n`
        note += `🏃 Dribles: ${stats.dribbles}\n`
        if (stats.goals > 0) note += `⚽ Gols: ${stats.goals}\n`
        break

      case 'FORWARD': {
        note += `⚽ Gols: ${stats.goals}\n`
        note += `🎯 Assistências: ${stats.assists}\n`
        note += `🏃 Dribles: ${stats.dribbles}\n`
        const totalParticipation = stats.goals + stats.assists
        note += `📊 Participação em gols: ${totalParticipation}\n`
        break
      }
    }

    note += `\n📋 Resumo geral:\n`
    note += `• Total de ações: ${stats.totalPlays}\n`
    note += `• Ações positivas: ${stats.positiveActions}\n`
    note += `• Ações negativas: ${stats.negativeActions}\n`

    if (stats.fouls > 0) note += `• Faltas cometidas: ${stats.fouls}\n`
    if (stats.yellowCards > 0)
      note += `• Cartões amarelos: ${stats.yellowCards}\n`
    if (stats.redCards > 0) note += `• Cartões vermelhos: ${stats.redCards}\n`

    return note
  }

  private getPositionName(position: Position): string {
    const positionNames: { [key in Position]: string } = {
      GOALKEEPER: 'Goleiro',
      DEFENDER: 'Zagueiro',
      MIDFIELDER: 'Meio-campista',
      FORWARD: 'Atacante',
    }
    return positionNames[position] || 'Jogador'
  }
}

export { MatchNotFoundError, AthleteNotFoundError }
