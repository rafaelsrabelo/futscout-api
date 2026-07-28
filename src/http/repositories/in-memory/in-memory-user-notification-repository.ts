import { randomUUID } from 'node:crypto'

import type { UserNotification } from '../../../../generated/prisma/client.js'
import type {
  CreateUserNotificationData,
  ListUserNotificationsFilters,
  UserNotificationRepository,
} from '../user-notification-repository.js'

export class InMemoryUserNotificationRepository
  implements UserNotificationRepository
{
  public items: UserNotification[] = []

  async create(data: CreateUserNotificationData): Promise<UserNotification> {
    const now = new Date()
    const notification: UserNotification = {
      id: randomUUID(),
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body,
      data: data.data ? JSON.parse(JSON.stringify(data.data)) : null,
      actorAthleteId: data.actorAthleteId ?? null,
      groupKey: data.groupKey,
      eventCount: 1,
      readAt: null,
      createdAt: now,
      updatedAt: now,
    }

    this.items.push(notification)
    return notification
  }

  async findOpenByGroupKey(
    groupKey: string,
    since: Date,
  ): Promise<UserNotification | null> {
    const matches = this.items.filter(
      (item) =>
        item.groupKey === groupKey &&
        item.readAt === null &&
        item.createdAt >= since,
    )

    if (matches.length === 0) return null

    return matches.reduce((latest, item) =>
      item.createdAt >= latest.createdAt ? item : latest,
    )
  }

  async incrementEvent(
    id: string,
    data: { title: string; body: string },
  ): Promise<UserNotification> {
    const notification = this.items.find((item) => item.id === id)

    if (!notification) {
      throw new Error('Notification not found')
    }

    notification.eventCount += 1
    notification.title = data.title
    notification.body = data.body
    notification.updatedAt = new Date()

    return notification
  }

  async findManyByUser(filters: ListUserNotificationsFilters) {
    const { userId, page = 1, limit = 20, onlyUnread = false } = filters

    const filtered = this.items
      .filter((item) => item.userId === userId)
      .filter((item) => (onlyUnread ? item.readAt === null : true))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return {
      items: filtered.slice((page - 1) * limit, page * limit),
      total: filtered.length,
    }
  }

  async countUnread(userId: string): Promise<number> {
    return this.items.filter(
      (item) => item.userId === userId && item.readAt === null,
    ).length
  }

  async markAsRead(
    id: string,
    userId: string,
  ): Promise<UserNotification | null> {
    const notification = this.items.find(
      (item) => item.id === id && item.userId === userId,
    )

    if (!notification) return null

    notification.readAt ??= new Date()
    return notification
  }

  async markAllAsRead(userId: string): Promise<number> {
    const unread = this.items.filter(
      (item) => item.userId === userId && item.readAt === null,
    )

    for (const notification of unread) {
      notification.readAt = new Date()
    }

    return unread.length
  }
}
