import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryNotificationLogsRepository } from '../../repositories/in-memory/in-memory-notification-logs-repository.js'
import { NotificationNotFoundError } from '../errors/notification-not-found-error.js'
import { GetNotificationAdminUseCase } from './get-notification.js'

let notificationLogsRepository: InMemoryNotificationLogsRepository
let sut: GetNotificationAdminUseCase

beforeEach(() => {
  notificationLogsRepository = new InMemoryNotificationLogsRepository()
  sut = new GetNotificationAdminUseCase(notificationLogsRepository)
})

describe('Get Notification Admin Use Case', () => {
  it('should return the notification by id', async () => {
    const created = await notificationLogsRepository.create({
      title: 'Olá',
      body: 'Mensagem',
      data: { screen: '/(private)/(tabs)/profile' },
      audienceType: 'USER_IDS',
      audiencePayload: { type: 'USER_IDS', userIds: ['u-1'] },
      sentByUserId: 'admin-1',
      totalRecipients: 1,
      totalWithToken: 1,
      successCount: 1,
      failureCount: 0,
      invalidTokensCnt: 0,
    })

    const { notification } = await sut.execute({ id: created.id })

    expect(notification.id).toBe(created.id)
    expect(notification.title).toBe('Olá')
    expect(notification.data).toEqual({ screen: '/(private)/(tabs)/profile' })
  })

  it('should throw NotificationNotFoundError for unknown id', async () => {
    await expect(() =>
      sut.execute({ id: 'does-not-exist' }),
    ).rejects.toBeInstanceOf(NotificationNotFoundError)
  })
})
