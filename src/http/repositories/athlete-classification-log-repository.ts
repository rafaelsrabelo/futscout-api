import type { AthleteClassificationLog } from 'generated/prisma/client.js'

export type ClassificationValue = 'DESENVOLVIMENTO' | 'PERFORMANCE' | null

export interface CreateAthleteClassificationLogData {
  athleteId: string
  classification: ClassificationValue
  comment: string | null
  classifiedById: string
}

export interface AthleteClassificationLogWithAdmin
  extends AthleteClassificationLog {
  classifiedBy: {
    id: string
    name: string
    email: string
  }
}

export interface ListAthleteClassificationLogsResponse {
  items: AthleteClassificationLogWithAdmin[]
  total: number
}

export interface AthleteClassificationLogRepository {
  create(
    data: CreateAthleteClassificationLogData,
  ): Promise<AthleteClassificationLog>
  listByAthleteId(
    athleteId: string,
    pagination: { page: number; pageSize: number },
  ): Promise<ListAthleteClassificationLogsResponse>
}
