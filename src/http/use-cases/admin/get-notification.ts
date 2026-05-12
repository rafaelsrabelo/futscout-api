import type {
  NotificationLogEntity,
  NotificationLogsRepository,
} from '../../repositories/notification-logs-repository.js'
import { NotificationNotFoundError } from '../errors/notification-not-found-error.js'

export interface GetNotificationAdminRequest {
  id: string
}

export interface GetNotificationAdminResponse {
  notification: NotificationLogEntity
}

export class GetNotificationAdminUseCase {
  constructor(private notificationLogsRepository: NotificationLogsRepository) {}

  async execute({
    id,
  }: GetNotificationAdminRequest): Promise<GetNotificationAdminResponse> {
    const notification = await this.notificationLogsRepository.findById(id)
    if (!notification) throw new NotificationNotFoundError()
    return { notification }
  }
}
