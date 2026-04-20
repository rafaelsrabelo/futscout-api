import type { User } from 'generated/prisma/client.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryDashboardRepository } from '../../repositories/in-memory/in-memory-dashboard-repository.js'
import {
  DashboardUserGrowthUseCase,
  RangeTooLargeError,
} from './dashboard-user-growth.js'

let dashboardRepository: InMemoryDashboardRepository
let sut: DashboardUserGrowthUseCase

function makeUser(
  id: string,
  role: 'ATHLETE' | 'OBSERVER',
  createdAt: Date,
): User {
  return {
    id,
    email: `${id}@x.com`,
    name: 'User',
    password: 'hashed',
    role,
    provider: 'CREDENTIALS',
    providerId: null,
    emailVerified: true,
    isActive: true,
    isProfile: true,
    stripeCustomerId: null,
    lastLoginAt: null,
    createdAt,
    updatedAt: createdAt,
  }
}

beforeEach(() => {
  dashboardRepository = new InMemoryDashboardRepository()
  sut = new DashboardUserGrowthUseCase(dashboardRepository)
})

describe('Dashboard User Growth Use Case', () => {
  it('returns empty buckets filled with zero for the default 30-day window', async () => {
    const result = await sut.execute({})

    expect(result.period).toBe('daily')
    expect(result.series.length).toBeGreaterThan(0)
    expect(result.series.every((b) => b.total === 0)).toBe(true)
  })

  it('aggregates signups by daily bucket', async () => {
    const day = new Date('2025-06-10T12:00:00Z')
    dashboardRepository.users.push(
      makeUser('a1', 'ATHLETE', new Date('2025-06-10T01:00:00Z')),
      makeUser('a2', 'ATHLETE', new Date('2025-06-10T20:00:00Z')),
      makeUser('o1', 'OBSERVER', new Date('2025-06-11T10:00:00Z')),
    )

    const result = await sut.execute({
      period: 'daily',
      from: new Date('2025-06-10T00:00:00Z'),
      to: new Date('2025-06-12T00:00:00Z'),
    })

    const day10 = result.series.find(
      (b) => b.bucket.toISOString().startsWith('2025-06-10'),
    )
    const day11 = result.series.find(
      (b) => b.bucket.toISOString().startsWith('2025-06-11'),
    )

    expect(day10?.newAthletes).toBe(2)
    expect(day10?.total).toBe(2)
    expect(day11?.newObservers).toBe(1)
    expect(day11?.total).toBe(1)
  })

  it('throws RangeTooLargeError when range exceeds 365 days', async () => {
    const to = new Date()
    const from = new Date(to)
    from.setDate(from.getDate() - 400)

    await expect(sut.execute({ from, to })).rejects.toBeInstanceOf(
      RangeTooLargeError,
    )
  })

  it('aggregates monthly when period=monthly', async () => {
    dashboardRepository.users.push(
      makeUser('a1', 'ATHLETE', new Date('2025-06-10')),
      makeUser('a2', 'ATHLETE', new Date('2025-06-20')),
      makeUser('a3', 'ATHLETE', new Date('2025-07-01')),
    )

    const result = await sut.execute({
      period: 'monthly',
      from: new Date('2025-06-01'),
      to: new Date('2025-07-15'),
    })

    const june = result.series.find((b) => b.bucket.getUTCMonth() === 5)
    expect(june?.total).toBe(2)
  })
})
