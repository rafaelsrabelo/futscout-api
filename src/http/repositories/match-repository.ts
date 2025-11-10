import type { Match, Prisma } from '../../../generated/prisma/client.js'

export interface MatchRepository {
  create(data: Prisma.MatchCreateInput): Promise<Match>
  findById(id: string): Promise<Match | null>
  findByAthlete(athleteId: string): Promise<Match[]>
  findByAthleteIdAndStatus(athleteId: string, status: string): Promise<Match[]>
  update(id: string, data: Prisma.MatchUpdateInput): Promise<Match>
  delete(id: string): Promise<void>
  findByAthleteWithPlays(athleteId: string): Promise<Match[]>
  findByIdWithPlays(id: string): Promise<Match | null>
}
