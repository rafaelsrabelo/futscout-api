export interface CreateTeamData {
  name: string
  nickname?: string | null
  acronym: string
  shieldPhoto?: string | null
  userId: string
}

export interface UpdateTeamData {
  name?: string
  acronym?: string
  shieldPhoto?: string | null
  category?:
    | 'U5'
    | 'U6'
    | 'U7'
    | 'U8'
    | 'U9'
    | 'U10'
    | 'U11'
    | 'U12'
    | 'U13'
    | 'U14'
    | 'U15'
    | 'U16'
    | 'U17'
    | 'U18'
    | 'U19'
    | 'U20'
    | 'AMATEUR'
    | 'PROFESSIONAL'
}

export interface Team {
  id: string
  name: string
  nickname: string | null
  acronym: string
  shieldPhoto: string | null
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
}
