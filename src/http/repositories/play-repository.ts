import type {
  Play,
  PlayClassification,
  PlayClassifications,
  PlayType,
  Prisma,
} from '../../../generated/prisma/client.js'

export type PlayWithClassifications = Play & {
  classifications: PlayClassifications[]
}

export interface CreatePlayWithClassificationsInput {
  matchId: string
  athleteId: string
  playType: PlayType
  videoUrl?: string | null
  thumbnailUrl?: string | null
  photoUrl?: string | null
  rating?: number | null
  observations?: string | null
  classifications?: PlayClassification[]
}

export interface AdminAthletePlayFilters {
  hasVideo?: boolean
  playType?: PlayType
  matchId?: string
  from?: Date
  to?: Date
}

export interface AdminAthletePlayPagination {
  page: number
  pageSize: number
}

export type AdminAthletePlayListItem = PlayWithClassifications & {
  match: { id: string; date: Date; adversaryTeam: string } | null
}

export interface PlayRepository {
  create(data: Prisma.PlayCreateInput): Promise<Play>
  createWithClassifications(
    input: CreatePlayWithClassificationsInput,
  ): Promise<PlayWithClassifications>
  findById(id: string): Promise<Play | null>
  findByMatch(matchId: string): Promise<Play[]>
  findManyByMatchId(matchId: string): Promise<Play[]>
  findVideosByAthleteId(athleteId: string): Promise<Play[]>
  findManyByAthleteForAdmin(
    athleteProfileId: string,
    filters: AdminAthletePlayFilters,
    pagination: AdminAthletePlayPagination,
  ): Promise<{ items: AdminAthletePlayListItem[]; total: number }>
  updateVideoUrl(
    id: string,
    videoUrl: string,
    thumbnailUrl?: string | null,
  ): Promise<Play>
  clearVideo(id: string): Promise<Play>
  update(id: string, data: Prisma.PlayUpdateInput): Promise<Play>
  delete(id: string): Promise<void>
}
