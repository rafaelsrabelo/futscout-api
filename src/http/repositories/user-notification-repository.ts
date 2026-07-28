import type { UserNotification } from '../../../generated/prisma/client.js'

export type UserNotificationType = 'FAVORITE_MATCH' | 'FAVORITE_PLAY'

/** Payload de deep link entregue ao app junto do push. */
export interface UserNotificationData {
  screen: string
  params?: Record<string, string>
}

export interface CreateUserNotificationData {
  userId: string
  type: UserNotificationType
  title: string
  body: string
  data?: UserNotificationData | null
  actorAthleteId?: string | null
  groupKey: string
}

export interface ListUserNotificationsFilters {
  userId: string
  page?: number
  limit?: number
  onlyUnread?: boolean
}

export interface UserNotificationRepository {
  create(data: CreateUserNotificationData): Promise<UserNotification>

  /**
   * Notificação ainda NÃO LIDA do mesmo grupo criada depois de `since`.
   * É o que permite agregar: em vez de oito pushes por oito lances, um só
   * com "publicou 8 novos lances".
   */
  findOpenByGroupKey(
    groupKey: string,
    since: Date,
  ): Promise<UserNotification | null>

  /** Soma um evento ao grupo e reescreve o texto. */
  incrementEvent(
    id: string,
    data: { title: string; body: string },
  ): Promise<UserNotification>

  findManyByUser(
    filters: ListUserNotificationsFilters,
  ): Promise<{ items: UserNotification[]; total: number }>

  countUnread(userId: string): Promise<number>

  /** Devolve null quando a notificação não é do usuário — o caller vira 404. */
  markAsRead(id: string, userId: string): Promise<UserNotification | null>

  markAllAsRead(userId: string): Promise<number>
}
