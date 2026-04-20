import type { Prisma, TeamHistory } from '../../../generated/prisma/client.js'

export type TeamHistoryWithTeam = TeamHistory & {
  team: {
    id: string
    name: string
    acronym: string | null
    shieldPhoto: string | null
  }
}

export interface TeamHistoryRepository {
  create(data: Prisma.TeamHistoryCreateInput): Promise<TeamHistory>
  findByAthleteId(athleteId: string): Promise<TeamHistory[]>
  findById(id: string): Promise<TeamHistory | null>
  update(id: string, data: Prisma.TeamHistoryUpdateInput): Promise<TeamHistory>
  delete(id: string): Promise<void>
  findCurrentTeams(athleteId: string): Promise<TeamHistory[]>
  findFormerTeams(athleteId: string): Promise<TeamHistory[]>
  findManyWithTeamByAthlete(
    athleteProfileId: string,
  ): Promise<TeamHistoryWithTeam[]>
}
