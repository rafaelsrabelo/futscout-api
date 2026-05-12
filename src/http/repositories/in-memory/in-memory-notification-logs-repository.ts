import { randomUUID } from 'node:crypto'

import type {
  CreateNotificationLogInput,
  ListNotificationsParams,
  ListNotificationsResult,
  NotificationLogEntity,
  NotificationLogsRepository,
} from '../notification-logs-repository.js'

export class InMemoryNotificationLogsRepository
  implements NotificationLogsRepository
{
  public items: NotificationLogEntity[] = []

  async create(
    data: CreateNotificationLogInput,
  ): Promise<NotificationLogEntity> {
    const created: NotificationLogEntity = {
      id: randomUUID(),
      ...data,
      createdAt: new Date(),
    }
    this.items.push(created)
    return created
  }

  async findById(id: string): Promise<NotificationLogEntity | null> {
    return this.items.find((n) => n.id === id) ?? null
  }

  async list(
    params: ListNotificationsParams,
  ): Promise<ListNotificationsResult> {
    const sorted = [...this.items].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )
    const start = (params.page - 1) * params.pageSize
    const items = sorted.slice(start, start + params.pageSize)
    return { items, total: this.items.length }
  }
}
