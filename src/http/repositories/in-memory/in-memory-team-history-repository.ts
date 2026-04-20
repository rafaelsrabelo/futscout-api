import type { Prisma, TeamHistory } from '../../../../generated/prisma/client.js'
import type {
  TeamHistoryRepository,
  TeamHistoryWithTeam,
} from '../team-history-repository.js'

type TeamMeta = {
  id: string
  name: string
  acronym: string | null
  shieldPhoto: string | null
}

export class InMemoryTeamHistoryRepository implements TeamHistoryRepository {
  public items: TeamHistory[] = []
  public teams: Record<string, TeamMeta> = {}

  async create(data: Prisma.TeamHistoryCreateInput): Promise<TeamHistory> {
    throw new Error('InMemoryTeamHistoryRepository.create: not implemented')
  }

  async findByAthleteId(athleteId: string): Promise<TeamHistory[]> {
    return this.items.filter((i) => i.athleteId === athleteId)
  }

  async findById(id: string): Promise<TeamHistory | null> {
    return this.items.find((i) => i.id === id) ?? null
  }

  async update(
    id: string,
    data: Prisma.TeamHistoryUpdateInput,
  ): Promise<TeamHistory> {
    throw new Error('InMemoryTeamHistoryRepository.update: not implemented')
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((i) => i.id !== id)
  }

  async findCurrentTeams(athleteId: string): Promise<TeamHistory[]> {
    return this.items.filter(
      (i) => i.athleteId === athleteId && i.endDate === null,
    )
  }

  async findFormerTeams(athleteId: string): Promise<TeamHistory[]> {
    return this.items.filter(
      (i) => i.athleteId === athleteId && i.endDate !== null,
    )
  }

  async findManyWithTeamByAthlete(
    athleteProfileId: string,
  ): Promise<TeamHistoryWithTeam[]> {
    const rows = this.items
      .filter((i) => i.athleteId === athleteProfileId)
      .slice()
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())

    return rows.map((row) => ({
      ...row,
      team: this.teams[row.teamId] ?? {
        id: row.teamId,
        name: 'Unknown',
        acronym: null,
        shieldPhoto: null,
      },
    }))
  }
}
