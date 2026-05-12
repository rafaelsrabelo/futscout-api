import type {
  NotificationLogEntity,
  NotificationLogsRepository,
} from '../../repositories/notification-logs-repository.js'

export interface ListNotificationsAdminRequest {
  page?: number
  pageSize?: number
}

export interface ListNotificationsAdminResponse {
  items: NotificationLogEntity[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

export class ListNotificationsAdminUseCase {
  constructor(private notificationLogsRepository: NotificationLogsRepository) {}

  async execute({
    page = 1,
    pageSize = 20,
  }: ListNotificationsAdminRequest): Promise<ListNotificationsAdminResponse> {
    const { items, total } = await this.notificationLogsRepository.list({
      page,
      pageSize,
    })

    return {
      items,
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
    }
  }
}
