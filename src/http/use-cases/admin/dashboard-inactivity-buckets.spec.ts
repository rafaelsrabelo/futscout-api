import type { User } from 'generated/prisma/client.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryDashboardRepository } from '../../repositories/in-memory/in-memory-dashboard-repository.js'
import { DashboardInactivityBucketsUseCase } from './dashboard-inactivity-buckets.js'

let dashboardRepository: InMemoryDashboardRepository
let sut: DashboardInactivityBucketsUseCase

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
  sut = new DashboardInactivityBucketsUseCase(dashboardRepository)
})

describe('Dashboard Inactivity Buckets Use Case', () => {
  it('returns all six buckets with zero counts when no users', async () => {
    const result = await sut.execute()
    expect(result.buckets.map((b) => b.label)).toEqual([
      '0-7d',
      '7-30d',
      '30-90d',
      '90-180d',
      '180d+',
      'never',
    ])
    expect(result.total).toBe(0)
  })

  it('distributes users across buckets by lastLoginAt age', async () => {
    const now = new Date()
    const d3 = new Date(now)
    d3.setDate(d3.getDate() - 3)
    const d15 = new Date(now)
    d15.setDate(d15.getDate() - 15)
    const d60 = new Date(now)
    d60.setDate(d60.getDate() - 60)
    const d120 = new Date(now)
    d120.setDate(d120.getDate() - 120)
    const d300 = new Date(now)
    d300.setDate(d300.getDate() - 300)

    dashboardRepository.users.push(
      makeUser('u3', d3),
      makeUser('u15', d15),
      makeUser('u60', d60),
      makeUser('u120', d120),
      makeUser('u300', d300),
      makeUser('never1', null),
      makeUser('never2', null),
    )

    const result = await sut.execute()

    const by = (label: string) =>
      result.buckets.find((b) => b.label === label)?.count ?? 0

    expect(by('0-7d')).toBe(1)
    expect(by('7-30d')).toBe(1)
    expect(by('30-90d')).toBe(1)
    expect(by('90-180d')).toBe(1)
    expect(by('180d+')).toBe(1)
    expect(by('never')).toBe(2)
    expect(result.total).toBe(7)
  })
})
