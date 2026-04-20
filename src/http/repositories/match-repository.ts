import type {
  Match,
  MatchResult,
  MatchStatus,
  Prisma,
} from '../../../generated/prisma/client.js'

export interface AdminMatchFilters {
  competitionId?: string
  status?: MatchStatus
  result?: MatchResult
  from?: Date
  to?: Date
}

export interface AdminPagination {
  page: number
  pageSize: number
}

export type AdminMatchListItem = Match & {
  playsCount: number
  competition: { id: string; name: string } | null
}

export interface AdminGlobalMatchFilters {
  q?: string
  athleteId?: string
  primaryPosition?: 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD'
  minAge?: number
  maxAge?: number
  competitionId?: string
  status?: MatchStatus
  result?: MatchResult
  from?: Date
  to?: Date
}

export type AdminGlobalMatchListItem = Match & {
  playsCount: number
  competition: { id: string; name: string } | null
  athleteProfile: {
    id: string
    name: string
    nickname: string | null
    profilePhoto: string | null
    primaryPosition: 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD'
  }
}

export interface MatchRepository {
  create(data: Prisma.MatchCreateInput): Promise<Match>
  findById(id: string): Promise<Match | null>
  findByAthlete(athleteId: string): Promise<Match[]>
  findByAthleteIdAndStatus(athleteId: string, status: string): Promise<Match[]>
  update(id: string, data: Prisma.MatchUpdateInput): Promise<Match>
  delete(id: string): Promise<void>
  findByAthleteWithPlays(athleteId: string): Promise<Match[]>
  findByIdWithPlays(id: string): Promise<Match | null>
  findManyByAthleteForAdmin(
    athleteProfileId: string,
    filters: AdminMatchFilters,
    pagination: AdminPagination,
  ): Promise<{ items: AdminMatchListItem[]; total: number }>
  findManyGlobalForAdmin(
    filters: AdminGlobalMatchFilters,
    pagination: AdminPagination,
  ): Promise<{ items: AdminGlobalMatchListItem[]; total: number }>
  findByIdForAdmin(id: string): Promise<AdminMatchDetail | null>
  searchByTerm(term: string, limit: number): Promise<AdminMatchSearchResult[]>
}

export interface AdminMatchSearchResult {
  id: string
  date: Date
  adversaryTeam: string
  myTeamScore: number | null
  adversaryScore: number | null
  athlete: {
    id: string
    name: string
    profilePhoto: string | null
  }
}

export type AdminMatchDetail = Match & {
  playsCount: number
  competition: { id: string; name: string } | null
  myTeam: { id: string; name: string; acronym: string | null } | null
  athleteProfile: {
    id: string
    name: string
    nickname: string | null
    profilePhoto: string | null
    primaryPosition: 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD'
  }
}
