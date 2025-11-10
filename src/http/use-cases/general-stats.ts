import type { Match, Play } from '../../../generated/prisma/client.js'

export interface ModalilyStats {
  matches: number
  wins: number
  losses: number
  draws: number
  goals: number
  assists: number
  averageRating: number
}

export interface CategoryStats {
  matches: number
  wins: number
  goals: number
  assists: number
  averageRating: number
}

export interface MatchSummary {
  id: string
  date: Date
  myTeam: string
  adversaryTeam: string
  result: string
  myTeamScore: number | null
  adversaryScore: number | null
  performanceRating: number | null
  goals: number
  assists: number
  totalPlays: number
}

export interface GeneralStatsResponse {
  totalMatches: number
  matchesByResult: {
    wins: number
    losses: number
    draws: number
    notFinished: number
  }
  totalPlays: number
  playsByType: {
    goals: number
    assists: number
    saves: number
    tackles: number
    interceptions: number
    crosses: number
    dribbles: number
    fouls: number
    yellowCards: number
    redCards: number
    shots: number
    passes: number
    headers: number
  }
  averagePerMatch: {
    goals: number // Formatado com 1 casa decimal
    assists: number // Formatado com 1 casa decimal
    rating: number // Formatado com 1 casa decimal
    timeOnField: number // Formatado sem casas decimais (minutos)
  }
  positionStats: {
    starterMatches: number
    substituteMatches: number
  }
  performanceByModality: {
    FUT_11: ModalilyStats
    FUT_7: ModalilyStats
    FUTSAL: ModalilyStats
  }
  performanceByCategory: {
    [key: string]: CategoryStats
  }
  bestPerformances: {
    bestRatedMatch: MatchSummary | null
    mostGoalsInMatch: MatchSummary | null
    mostAssistsInMatch: MatchSummary | null
  }
  recentForm: {
    last5Matches: MatchSummary[]
    winRate: number // Formatado como percentual com 1 casa decimal
  }
  summary?: {
    overallPerformance: string
    strongestSkill: string
    preferredModality: string
    formTrend: string
  }
}

export class GeneralStatsCalculator {
  private static formatNumber(num: number, decimals: number = 2): number {
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals)
  }

  private static formatPercentage(num: number): number {
    return this.formatNumber(num, 1)
  }

  static calculate(matches: Match[], plays: Play[]): GeneralStatsResponse {
    const finishedMatches = matches.filter((m) => m.result !== 'NOT_FINISHED')

    // Estatísticas básicas - só partidas finalizadas
    const totalMatches = finishedMatches.length
    const matchesByResult = {
      wins: finishedMatches.filter((m) => m.result === 'WIN').length,
      losses: finishedMatches.filter((m) => m.result === 'LOSS').length,
      draws: finishedMatches.filter((m) => m.result === 'DRAW').length,
      notFinished: matches.filter((m) => m.result === 'NOT_FINISHED').length,
    }

    // Estatísticas de plays
    const totalPlays = plays.length
    const playsByType = {
      goals: plays.filter((p) => p.playType === 'GOAL').length,
      assists: plays.filter((p) => p.playType === 'ASSIST').length,
      saves: plays.filter((p) =>
        ['DIFFICULT_SAVE', 'EASY_SAVE'].includes(p.playType),
      ).length,
      tackles: plays.filter((p) => p.playType === 'TACKLE').length,
      interceptions: plays.filter((p) => p.playType === 'INTERCEPTION').length,
      crosses: plays.filter((p) => p.playType === 'CROSS').length,
      dribbles: plays.filter((p) => p.playType === 'DRIBBLE').length,
      fouls: plays.filter((p) => p.playType === 'FOUL_COMMITTED').length,
      yellowCards: plays.filter((p) => p.playType === 'YELLOW_CARD').length,
      redCards: plays.filter((p) => p.playType === 'RED_CARD').length,
      shots: plays.filter((p) =>
        ['RIGHT_FOOT_SHOT', 'LEFT_FOOT_SHOT'].includes(p.playType),
      ).length,
      passes: plays.filter((p) =>
        ['PASS', 'KEY_PASS', 'LONG_PASS'].includes(p.playType),
      ).length,
      headers: plays.filter((p) => p.playType === 'HEADER').length,
    }

    // Médias por partida
    const averagePerMatch = {
      goals:
        finishedMatches.length > 0
          ? this.formatNumber(playsByType.goals / finishedMatches.length, 1)
          : 0,
      assists:
        finishedMatches.length > 0
          ? this.formatNumber(playsByType.assists / finishedMatches.length, 1)
          : 0,
      rating: this.formatNumber(
        this.calculateAverageRating(finishedMatches),
        1,
      ),
      timeOnField: this.formatNumber(
        this.calculateAverageTime(finishedMatches),
        0,
      ),
    }

    // Estatísticas por posição
    const positionStats = {
      starterMatches: finishedMatches.filter(
        (m) => m.playerPosition === 'STARTER',
      ).length,
      substituteMatches: finishedMatches.filter(
        (m) => m.playerPosition === 'SUBSTITUTE',
      ).length,
    }

    // Performance por modalidade
    const performanceByModality = {
      FUT_11: this.calculateModalityStats(finishedMatches, plays, 'FUT_11'),
      FUT_7: this.calculateModalityStats(finishedMatches, plays, 'FUT_7'),
      FUTSAL: this.calculateModalityStats(finishedMatches, plays, 'FUTSAL'),
    }

    // Performance por categoria
    const performanceByCategory = this.calculateCategoryStats(
      finishedMatches,
      plays,
    )

    // Melhores performances
    const bestPerformances = {
      bestRatedMatch: this.findBestRatedMatch(finishedMatches, plays),
      mostGoalsInMatch: this.findMostGoalsMatch(finishedMatches, plays),
      mostAssistsInMatch: this.findMostAssistsMatch(finishedMatches, plays),
    }

    // Forma recente
    const recentForm = this.calculateRecentForm(finishedMatches, plays)

    // Resumo executivo
    const summary = this.generateSummary(
      finishedMatches,
      averagePerMatch,
      performanceByModality,
      recentForm,
    )

    return {
      totalMatches,
      matchesByResult,
      totalPlays,
      playsByType,
      averagePerMatch,
      positionStats,
      performanceByModality,
      performanceByCategory,
      bestPerformances,
      recentForm,
      summary,
    }
  }

  private static calculateAverageRating(matches: Match[]): number {
    const ratedMatches = matches.filter(
      (m) => m.performanceRating !== null && m.result !== 'NOT_FINISHED',
    )
    if (ratedMatches.length === 0) return 0

    const sum = ratedMatches.reduce(
      (acc, m) => acc + (m.performanceRating || 0),
      0,
    )
    return sum / ratedMatches.length
  }

  private static calculateAverageTime(matches: Match[]): number {
    const timedMatches = matches.filter(
      (m) => m.approximateTime !== null && m.result !== 'NOT_FINISHED',
    )
    if (timedMatches.length === 0) return 0

    const sum = timedMatches.reduce(
      (acc, m) => acc + (m.approximateTime || 0),
      0,
    )
    return sum / timedMatches.length
  }

  private static calculateModalityStats(
    matches: Match[],
    plays: Play[],
    modality: string,
  ): ModalilyStats {
    const modalityMatches = matches.filter((m) => m.modality === modality)
    const modalityPlays = plays.filter((p) =>
      modalityMatches.some((m) => m.id === p.matchId),
    )

    return {
      matches: modalityMatches.length,
      wins: modalityMatches.filter((m) => m.result === 'WIN').length,
      losses: modalityMatches.filter((m) => m.result === 'LOSS').length,
      draws: modalityMatches.filter((m) => m.result === 'DRAW').length,
      goals: modalityPlays.filter((p) => p.playType === 'GOAL').length,
      assists: modalityPlays.filter((p) => p.playType === 'ASSIST').length,
      averageRating: this.formatNumber(
        this.calculateAverageRating(modalityMatches),
        1,
      ),
    }
  }

  private static calculateCategoryStats(
    matches: Match[],
    plays: Play[],
  ): { [key: string]: CategoryStats } {
    const categories = [...new Set(matches.map((m) => m.category))]
    const stats: { [key: string]: CategoryStats } = {}

    categories.forEach((category) => {
      const categoryMatches = matches.filter((m) => m.category === category)
      const categoryPlays = plays.filter((p) =>
        categoryMatches.some((m) => m.id === p.matchId),
      )

      stats[category] = {
        matches: categoryMatches.length,
        wins: categoryMatches.filter((m) => m.result === 'WIN').length,
        goals: categoryPlays.filter((p) => p.playType === 'GOAL').length,
        assists: categoryPlays.filter((p) => p.playType === 'ASSIST').length,
        averageRating: this.formatNumber(
          this.calculateAverageRating(categoryMatches),
          1,
        ),
      }
    })

    return stats
  }

  private static createMatchSummary(match: Match, plays: Play[]): MatchSummary {
    const matchPlays = plays.filter((p) => p.matchId === match.id)

    return {
      id: match.id,
      date: match.date,
      // @ts-expect-error - Prisma include relation type issue
      myTeam: match.myTeam?.name || 'Unknown Team',
      adversaryTeam: match.adversaryTeam,
      result: match.result,
      myTeamScore: match.myTeamScore,
      adversaryScore: match.adversaryScore,
      performanceRating: match.performanceRating,
      goals: matchPlays.filter((p) => p.playType === 'GOAL').length,
      assists: matchPlays.filter((p) => p.playType === 'ASSIST').length,
      totalPlays: matchPlays.length,
    }
  }

  private static findBestRatedMatch(
    matches: Match[],
    plays: Play[],
  ): MatchSummary | null {
    const ratedMatches = matches.filter(
      (m) => m.performanceRating !== null && m.result !== 'NOT_FINISHED',
    )
    if (ratedMatches.length === 0) return null

    const bestMatch = ratedMatches.reduce((best, current) =>
      (current.performanceRating || 0) > (best.performanceRating || 0)
        ? current
        : best,
    )

    return this.createMatchSummary(bestMatch, plays)
  }

  private static findMostGoalsMatch(
    matches: Match[],
    plays: Play[],
  ): MatchSummary | null {
    const finishedMatches = matches.filter((m) => m.result !== 'NOT_FINISHED')
    if (finishedMatches.length === 0) return null

    const matchGoals = finishedMatches.map((match) => {
      const goals = plays.filter(
        (p) => p.matchId === match.id && p.playType === 'GOAL',
      ).length
      return { match, goals }
    })

    const bestMatch = matchGoals.reduce((best, current) =>
      current.goals > best.goals ? current : best,
    )

    return this.createMatchSummary(bestMatch.match, plays)
  }

  private static findMostAssistsMatch(
    matches: Match[],
    plays: Play[],
  ): MatchSummary | null {
    const finishedMatches = matches.filter((m) => m.result !== 'NOT_FINISHED')
    if (finishedMatches.length === 0) return null

    const matchAssists = finishedMatches.map((match) => {
      const assists = plays.filter(
        (p) => p.matchId === match.id && p.playType === 'ASSIST',
      ).length
      return { match, assists }
    })

    const bestMatch = matchAssists.reduce((best, current) =>
      current.assists > best.assists ? current : best,
    )

    return this.createMatchSummary(bestMatch.match, plays)
  }

  private static calculateRecentForm(
    matches: Match[],
    plays: Play[],
  ): { last5Matches: MatchSummary[]; winRate: number } {
    // Só pegar partidas finalizadas para o histórico recente
    const finishedMatches = matches.filter((m) => m.result !== 'NOT_FINISHED')

    const sortedMatches = finishedMatches
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)

    const last5Matches = sortedMatches.map((match) =>
      this.createMatchSummary(match, plays),
    )

    const wins = sortedMatches.filter((m) => m.result === 'WIN').length
    const winRate =
      sortedMatches.length > 0
        ? this.formatPercentage((wins / sortedMatches.length) * 100)
        : 0

    return {
      last5Matches,
      winRate,
    }
  }

  private static generateSummary(
    matches: Match[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    averagePerMatch: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    performanceByModality: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recentForm: any,
  ) {
    // Determinar performance geral baseado na nota média
    let overallPerformance = 'Iniciante'
    if (averagePerMatch.rating >= 4) {
      overallPerformance = 'Excelente'
    } else if (averagePerMatch.rating >= 3) {
      overallPerformance = 'Bom'
    } else if (averagePerMatch.rating >= 2) {
      overallPerformance = 'Regular'
    }

    // Identificar habilidade mais forte
    let strongestSkill = 'Versatilidade'
    if (averagePerMatch.goals > averagePerMatch.assists) {
      strongestSkill = 'Finalização'
    } else if (averagePerMatch.assists > averagePerMatch.goals) {
      strongestSkill = 'Criação de jogadas'
    }

    // Modalidade preferida (onde tem melhor performance)
    let preferredModality = 'FUT_11'
    let bestRating = 0
    Object.entries(performanceByModality).forEach(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ([modality, stats]: [string, any]) => {
        if (stats.matches > 0 && stats.averageRating > bestRating) {
          bestRating = stats.averageRating
          preferredModality =
            modality === 'FUT_11'
              ? 'Futebol 11'
              : modality === 'FUT_7'
                ? 'Futebol 7'
                : 'Futsal'
        }
      },
    )

    // Tendência da forma
    let formTrend = 'Estável'
    if (recentForm.winRate >= 60) {
      formTrend = 'Em alta'
    } else if (recentForm.winRate <= 30) {
      formTrend = 'Em baixa'
    }

    return {
      overallPerformance,
      strongestSkill,
      preferredModality,
      formTrend,
    }
  }
}
