import type { ScoutRepository } from '../repositories/scout-repository.js'
import type { PlayRepository } from '../repositories/play-repository.js'
import type { MatchRepository } from '../repositories/match-repository.js'
import type { AthleteProfileRepository } from '../repositories/athlete-profile-repository.js'
import { generateAIPerformanceAnalysis } from '../../lib/openai.js'
import { PlayType, type Play } from '../../../generated/prisma/client.js'

interface GenerateAIScoutUseCaseRequest {
  matchId: string
  athleteId: string
}

interface GenerateAIScoutUseCaseResponse {
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

export class GenerateAIScoutUseCase {
  constructor(
    private scoutRepository: ScoutRepository,
    private playRepository: PlayRepository,
    private matchRepository: MatchRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute({
    matchId,
    athleteId,
  }: GenerateAIScoutUseCaseRequest): Promise<GenerateAIScoutUseCaseResponse> {
    // Buscar dados necessários
    const [match, athleteProfile, plays] = await Promise.all([
      this.matchRepository.findById(matchId),
      this.athleteProfileRepository.findById(athleteId),
      this.playRepository.findManyByMatchId(matchId),
    ])

    if (!match) {
      throw new Error('Match not found')
    }

    if (!athleteProfile) {
      throw new Error('Athlete profile not found')
    }

    // Calcular estatísticas básicas
    const stats = this.calculateStats(plays)

    // Preparar dados para a IA
    const analysisData = {
      athleteProfile: {
        nickname: athleteProfile.nickname || 'Atleta',
        primaryPosition: athleteProfile.primaryPosition,
        age: this.calculateAge(athleteProfile.birthDate),
        currentClub: athleteProfile.currentClub || 'Sem clube',
      },
      match: {
        myTeam: match.myTeam,
        adversaryTeam: match.adversaryTeam,
        result: match.result,
        myTeamScore: match.myTeamScore || 0,
        adversaryScore: match.adversaryScore || 0,
        modality: match.modality,
        category: match.category,
        approximateTime: match.approximateTime || 90,
      },
      plays: plays.map((play) => ({
        playType: play.playType,
        rating: play.rating || 3,
        approximateTime: play.approximateTime || 0,
        observations: play.observations || '',
      })),
      stats: {
        ...stats,
        overallRating: stats.overallRating || 0,
      },
    }

    // Gerar análise com IA
    const aiAnalysis = await generateAIPerformanceAnalysis(analysisData)

    // Verificar se já existe scout
    const existingScout = await this.scoutRepository.findByMatchId(matchId)

    let scout
    if (existingScout) {
      // Atualizar scout existente com análise da IA
      scout = await this.scoutRepository.update(existingScout.id, {
        ...stats,
        performanceNote: `${aiAnalysis.performanceNote}\n\n**RECOMENDAÇÕES:**\n${aiAnalysis.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}`,
        strengths: JSON.stringify(aiAnalysis.strengths),
        weaknesses: JSON.stringify(aiAnalysis.weaknesses),
      })
    } else {
      // Criar novo scout com análise da IA
      scout = await this.scoutRepository.create({
        matchId,
        ...stats,
        performanceNote: `${aiAnalysis.performanceNote}\n\n**RECOMENDAÇÕES:**\n${aiAnalysis.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}`,
        strengths: JSON.stringify(aiAnalysis.strengths),
        weaknesses: JSON.stringify(aiAnalysis.weaknesses),
      })
    }

    return { scout }
  }

  private calculateStats(plays: Play[]) {
    const stats = {
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
      overallRating: null as number | null,
    }

    plays.forEach((play) => {
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
        case PlayType.PENALTY_SAVE:
        case PlayType.ONE_ON_ONE_SAVE:
        case PlayType.REFLEX_SAVE:
        case PlayType.DIVING_SAVE:
        case PlayType.CATCH:
          stats.saves++
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
        case PlayType.OFFENSIVE_FOUL:
        case PlayType.DEFENSIVE_FOUL:
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

    // Calcular rating geral
    const ratedPlays = plays.filter((play) => play.rating !== null)
    if (ratedPlays.length > 0) {
      stats.overallRating =
        ratedPlays.reduce((sum, play) => sum + (play.rating || 0), 0) /
        ratedPlays.length
    }

    return stats
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--
    }

    return age
  }
}
