import type { UserNotificationRepository } from '../../repositories/user-notification-repository.js'

interface ListUserNotificationsRequest {
  userId: string
  page?: number
  limit?: number
  onlyUnread?: boolean
}

interface UserNotificationView {
  id: string
  type: string
  title: string
  body: string
  data: unknown
  actorAthleteId: string | null
  /** Quantos eventos foram agrupados nesta notificação. */
  eventCount: number
  read: boolean
  readAt: Date | null
  createdAt: Date
}

interface ListUserNotificationsResponse {
  notifications: UserNotificationView[]
  total: number
  unreadCount: number
  page: number
  limit: number
}

export class ListUserNotificationsUseCase {
  constructor(private userNotificationRepository: UserNotificationRepository) {}

  async execute({
    userId,
    page = 1,
    limit = 20,
    onlyUnread = false,
  }: ListUserNotificationsRequest): Promise<ListUserNotificationsResponse> {
    const safePage = Math.max(1, Math.floor(page))
    const safeLimit = Math.min(50, Math.max(1, Math.floor(limit)))

    const [{ items, total }, unreadCount] = await Promise.all([
      this.userNotificationRepository.findManyByUser({
        userId,
        page: safePage,
        limit: safeLimit,
        onlyUnread,
      }),
      // Vai junto na listagem para o app atualizar o badge sem outra chamada.
      this.userNotificationRepository.countUnread(userId),
    ])

    return {
      notifications: items.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        body: item.body,
        data: item.data,
        actorAthleteId: item.actorAthleteId,
        eventCount: item.eventCount,
        read: item.readAt !== null,
        readAt: item.readAt,
        createdAt: item.createdAt,
      })),
      total,
      unreadCount,
      page: safePage,
      limit: safeLimit,
    }
  }
}
