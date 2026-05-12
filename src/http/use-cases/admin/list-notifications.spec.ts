import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryNotificationLogsRepository } from '../../repositories/in-memory/in-memory-notification-logs-repository.js'
import { ListNotificationsAdminUseCase } from './list-notifications.js'

let notificationLogsRepository: InMemoryNotificationLogsRepository
let sut: ListNotificationsAdminUseCase

beforeEach(async () => {
  notificationLogsRepository = new InMemoryNotificationLogsRepository()
  sut = new ListNotificationsAdminUseCase(notificationLogsRepository)

  for (let i = 1; i <= 5; i++) {
    await notificationLogsRepository.create({
      title: `Title ${i}`,
      body: `Body ${i}`,
      data: null,
      audienceType: 'ALL',
      audiencePayload: { type: 'ALL' },
      sentByUserId: 'admin-1',
      totalRecipients: i,
      totalWithToken: i,
      successCount: i,
      failureCount: 0,
      invalidTokensCnt: 0,
    })
    // Pequena pausa pra createdAt diferenciar (in-memory usa new Date()).
    await new Promise((resolve) => setTimeout(resolve, 2))
  }
})

describe('List Notifications Admin Use Case', () => {
  it('should paginate and sort by createdAt desc', async () => {
    const result = await sut.execute({ page: 1, pageSize: 2 })

    expect(result.total).toBe(5)
    expect(result.items).toHaveLength(2)
    expect(result.items[0].title).toBe('Title 5')
    expect(result.items[1].title).toBe('Title 4')
    expect(result.hasMore).toBe(true)
  })

  it('should return last page with hasMore=false', async () => {
    const result = await sut.execute({ page: 3, pageSize: 2 })

    expect(result.items).toHaveLength(1)
    expect(result.items[0].title).toBe('Title 1')
    expect(result.hasMore).toBe(false)
  })

  it('should use defaults when page/pageSize not provided', async () => {
    const result = await sut.execute({})

    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(20)
    expect(result.items).toHaveLength(5)
  })
})
