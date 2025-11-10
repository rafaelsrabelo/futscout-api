export interface CreateTeamData {
  name: string
  nickname?: string | null
  acronym: string
  shieldPhoto?: string | null
  isPrincipal?: boolean
  userId: string
}

export interface UpdateTeamData {
  name?: string
  acronym?: string
  shieldPhoto?: string | null
  isPrincipal?: boolean
}

export interface Team {
  id: string
  name: string
  nickname: string | null
  acronym: string
  shieldPhoto: string | null
  isPrincipal: boolean
  userId: string
  createdAt: Date
  updatedAt: Date
}

export interface TeamRepository {
  create(data: CreateTeamData): Promise<Team>
  findById(id: string): Promise<Team | null>
  findByUserId(userId: string): Promise<Team[]>
  findByName(name: string, userId: string): Promise<Team | null>
  update(id: string, data: UpdateTeamData): Promise<Team>
  delete(id: string): Promise<void>
  unsetPrincipalTeams(userId: string): Promise<void>
}
