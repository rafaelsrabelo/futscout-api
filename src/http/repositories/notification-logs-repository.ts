export type NotificationAudienceType = 'ALL' | 'USER_IDS' | 'ATHLETE_FILTER'

// Filtros aceitos quando audienceType === 'ATHLETE_FILTER'. Reflete os mesmos
// critérios disponíveis em list-athletes (admin).
export interface AthleteAudienceFilters {
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  primaryPosition?: 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD'
  dominantFoot?: 'RIGHT' | 'LEFT'
  classification?: 'DESENVOLVIMENTO' | 'PERFORMANCE' | 'UNCLASSIFIED'
  currentClub?: string
  minAge?: number
  maxAge?: number
  minHeight?: number
  maxHeight?: number
  minWeight?: number
  maxWeight?: number
}

export type NotificationAudiencePayload =
  | { type: 'ALL' }
  | { type: 'USER_IDS'; userIds: string[] }
  | { type: 'ATHLETE_FILTER'; filters: AthleteAudienceFilters }

export interface NotificationLogEntity {
  id: string
  title: string
  body: string
  data: Record<string, unknown> | null
  audienceType: NotificationAudienceType
  audiencePayload: NotificationAudiencePayload
  sentByUserId: string
  totalRecipients: number
  totalWithToken: number
  successCount: number
  failureCount: number
  invalidTokensCnt: number
  createdAt: Date
}

export interface CreateNotificationLogInput {
  title: string
  body: string
  data: Record<string, unknown> | null
  audienceType: NotificationAudienceType
  audiencePayload: NotificationAudiencePayload
  sentByUserId: string
  totalRecipients: number
  totalWithToken: number
  successCount: number
  failureCount: number
  invalidTokensCnt: number
}

export interface ListNotificationsParams {
  page: number
  pageSize: number
}

export interface ListNotificationsResult {
  items: NotificationLogEntity[]
  total: number
}

export interface NotificationLogsRepository {
  create(data: CreateNotificationLogInput): Promise<NotificationLogEntity>
  findById(id: string): Promise<NotificationLogEntity | null>
  list(params: ListNotificationsParams): Promise<ListNotificationsResult>
}
