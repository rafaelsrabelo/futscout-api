import type { User } from 'generated/prisma/client.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryDashboardRepository } from '../../repositories/in-memory/in-memory-dashboard-repository.js'
import { DashboardUserActivityUseCase } from './dashboard-user-activity.js'

let dashboardRepository: InMemoryDashboardRepository
let sut: DashboardUserActivityUseCase

function makeUser(id: string, lastLoginAt: Date | null): User {
  return {
    id,
    email: `${id}@x.com`,
    name: 'User',
    password: 'hashed',
    role: 'ATHLETE',
    provider: 'CREDENTIALS',
    providerId: null,
    emailVerified: true,
    isActive: true,
    isProfile: true,
    stripeCustomerId: null,
    lastLoginAt,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  }
}

beforeEach(() => {
  dashboardRepository = new InMemoryDashboardRepository()
  sut = new DashboardUserActivityUseCase(dashboardRepository)
})

describe('Dashboard User Activity Use Case', () => {
  it('returns all zeros when no users are present', async () => {
    const result = await sut.execute()
    expect(result.total).toBe(0)
    expect(result.activePercent30d).toBe(0)
  })

  it('partitions users by last-login windows', async () => {
    const now = new Date()
    const d1 = new Date(now)
    d1.setDate(d1.getDate() - 1)
    const d20 = new Date(now)
    d20.setDate(d20.getDate() - 20)
    const d60 = new Date(now)
    d60.setDate(d60.getDate() - 60)
    const d200 = new Date(now)
    d200.setDate(d200.getDate() - 200)

    dashboardRepository.users.push(
      makeUser('u1', d1),
      makeUser('u20', d20),
      makeUser('u60', d60),
      makeUser('u200', d200),
      makeUser('never', null),
    )

    const result = await sut.execute()

    expect(result.total).toBe(5)
    expect(result.activeLast7d).toBe(1)
    expect(result.activeLast30d).toBe(2)
    expect(result.activeLast90d).toBe(3)
    expect(result.inactiveOver30d).toBe(2)
    expect(result.inactiveOver90d).toBe(1)
    expect(result.neverLoggedIn).toBe(1)
  })

  it('computes activePercent30d correctly', async () => {
    const now = new Date()
    const recent = new Date(now)
    recent.setDate(recent.getDate() - 10)
    const old = new Date(now)
    old.setDate(old.getDate() - 100)

    dashboardRepository.users.push(
      makeUser('a', recent),
      makeUser('b', recent),
      makeUser('c', old),
      makeUser('d', null),
    )

    const result = await sut.execute()
    expect(result.activePercent30d).toBe(50) // 2/4 * 100 = 50.0
  })
})
