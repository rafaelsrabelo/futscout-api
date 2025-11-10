import type { TeamHistory, Prisma } from '../../../generated/prisma/client.js'

export interface TeamHistoryRepository {
  create(data: Prisma.TeamHistoryCreateInput): Promise<TeamHistory>
  findByAthleteId(athleteId: string): Promise<TeamHistory[]>
  findById(id: string): Promise<TeamHistory | null>
  update(id: string, data: Prisma.TeamHistoryUpdateInput): Promise<TeamHistory>
  delete(id: string): Promise<void>
  findCurrentTeams(athleteId: string): Promise<TeamHistory[]>
  findFormerTeams(athleteId: string): Promise<TeamHistory[]>
}
