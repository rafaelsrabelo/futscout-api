import type { User } from 'generated/prisma/client.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryDashboardRepository } from '../../repositories/in-memory/in-memory-dashboard-repository.js'
import { DashboardOverviewUseCase } from './dashboard-overview.js'

let dashboardRepository: InMemoryDashboardRepository
let sut: DashboardOverviewUseCase

function makeUser(
  id: string,
  role: 'ATHLETE' | 'OBSERVER' | 'ADMIN',
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
  sut = new DashboardOverviewUseCase(dashboardRepository)
})

describe('Dashboard Overview Use Case', () => {
  it('returns zeros when no data is present', async () => {
    const result = await sut.execute({ periodDays: 30 })

    expect(result.totals).toEqual({
      athletes: 0,
      observers: 0,
      matches: 0,
      plays: 0,
      achievements: 0,
      activeSubscriptions: 0,
    })
    expect(result.period.newAthletes).toBe(0)
    expect(result.period.days).toBe(30)
  })

  it('aggregates totals by role and other entities', async () => {
    dashboardRepository.users.push(
      makeUser('a1', 'ATHLETE', new Date('2025-01-01')),
      makeUser('a2', 'ATHLETE', new Date('2025-01-02')),
      makeUser('o1', 'OBSERVER', new Date('2025-01-01')),
    )
    dashboardRepository.matchesCount = 15
    dashboardRepository.playsCount = 42
    dashboardRepository.achievementsCount = 3
    dashboardRepository.activeSubscriptionsCount = 2

    const result = await sut.execute({})

    expect(result.totals.athletes).toBe(2)
    expect(result.totals.observers).toBe(1)
    expect(result.totals.matches).toBe(15)
    expect(result.totals.plays).toBe(42)
    expect(result.totals.achievements).toBe(3)
    expect(result.totals.activeSubscriptions).toBe(2)
  })

  it('counts new signups/matches/plays inside the period window only', async () => {
    const now = new Date()
    const within = new Date(now)
    within.setDate(within.getDate() - 5)
    const outside = new Date(now)
    outside.setDate(outside.getDate() - 60)

    dashboardRepository.users.push(
      makeUser('old', 'ATHLETE', outside),
      makeUser('new', 'ATHLETE', within),
    )
    dashboardRepository.matchesCreatedAt = [within, outside]
    dashboardRepository.playsCreatedAt = [within, within]

    const result = await sut.execute({ periodDays: 30 })

    expect(result.period.newAthletes).toBe(1)
    expect(result.period.newMatches).toBe(1)
    expect(result.period.newPlays).toBe(2)
  })

  it('honours periodDays when provided', async () => {
    const result = await sut.execute({ periodDays: 7 })
    expect(result.period.days).toBe(7)
    const diffDays =
      (result.period.to.getTime() - result.period.from.getTime()) /
      (24 * 3600 * 1000)
    expect(Math.round(diffDays)).toBe(7)
  })
})
