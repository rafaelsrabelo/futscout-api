import type { UserNotificationRepository } from '../../repositories/user-notification-repository.js'
import { NotificationNotFoundError } from '../errors/notification-not-found-error.js'

interface MarkNotificationReadRequest {
  notificationId: string
  userId: string
}

interface MarkNotificationReadResponse {
  unreadCount: number
}

export class MarkNotificationReadUseCase {
  constructor(private userNotificationRepository: UserNotificationRepository) {}

  async execute({
    notificationId,
    userId,
  }: MarkNotificationReadRequest): Promise<MarkNotificationReadResponse> {
    // Notificação de outro usuário responde igual a inexistente.
    const notification = await this.userNotificationRepository.markAsRead(
      notificationId,
      userId,
    )

    if (!notification) {
      throw new NotificationNotFoundError()
    }

    return {
      unreadCount: await this.userNotificationRepository.countUnread(userId),
    }
  }
}
