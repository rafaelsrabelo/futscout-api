import { randomUUID } from 'node:crypto'

import type {
  Prisma,
  TeamHistory,
} from '../../../../generated/prisma/client.js'
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
    const athleteId =
      (data as { athlete?: { connect?: { id?: string } } }).athlete?.connect
        ?.id ?? null
    const teamId =
      (data as { team?: { connect?: { id?: string } } }).team?.connect?.id ??
      null

    if (!athleteId || !teamId) {
      throw new Error('athlete.connect.id and team.connect.id required')
    }

    const now = new Date()
    const teamHistory: TeamHistory = {
      id: randomUUID(),
      athleteId,
      teamId,
      startDate: data.startDate as Date,
      endDate: (data.endDate as Date | null | undefined) ?? null,
      createdAt: now,
      updatedAt: now,
    }
    this.items.push(teamHistory)
    return teamHistory
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
    const idx = this.items.findIndex((i) => i.id === id)
    if (idx === -1) throw new Error('Team history not found')

    const current = this.items[idx]!
    const next: TeamHistory = { ...current, updatedAt: new Date() }

    if (data.startDate !== undefined) {
      next.startDate = data.startDate as Date
    }
    if (data.endDate !== undefined) {
      next.endDate = data.endDate as Date | null
    }

    const teamConnect = (data as { team?: { connect?: { id?: string } } }).team
      ?.connect?.id
    if (teamConnect) {
      next.teamId = teamConnect
    }

    this.items[idx] = next
    return next
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
