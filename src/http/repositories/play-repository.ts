import type { Play, Prisma } from '../../../generated/prisma/client.js'

export interface PlayRepository {
  create(data: Prisma.PlayCreateInput): Promise<Play>
  findById(id: string): Promise<Play | null>
  findByMatch(matchId: string): Promise<Play[]>
  findManyByMatchId(matchId: string): Promise<Play[]>
  findVideosByAthleteId(athleteId: string): Promise<Play[]>
  update(id: string, data: Prisma.PlayUpdateInput): Promise<Play>
  delete(id: string): Promise<void>
}
