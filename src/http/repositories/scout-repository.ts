import type { Scout } from '../../../generated/prisma/client.js'

export interface ScoutCreateInput {
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
  overallRating?: number | null
  performanceNote?: string | null
  strengths?: string | null
  weaknesses?: string | null
}

export interface ScoutUpdateInput {
  totalPlays?: number
  positiveActions?: number
  negativeActions?: number
  neutralActions?: number
  goals?: number
  assists?: number
  saves?: number
  defensiveActions?: number
  tackles?: number
  interceptions?: number
  crosses?: number
  dribbles?: number
  fouls?: number
  yellowCards?: number
  redCards?: number
  overallRating?: number | null
  performanceNote?: string | null
  strengths?: string | null
  weaknesses?: string | null
}

export interface ScoutRepository {
  create(data: ScoutCreateInput): Promise<Scout>
  findByMatchId(matchId: string): Promise<Scout | null>
  update(id: string, data: ScoutUpdateInput): Promise<Scout>
}
