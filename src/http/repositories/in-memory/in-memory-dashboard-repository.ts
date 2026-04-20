import type { User } from '../../../../generated/prisma/client.js'
import type {
  DashboardPeriodCounts,
  DashboardRepository,
  DashboardTotals,
  InactivityBucket,
  UserActivityCounts,
  UserGrowthBucket,
} from '../dashboard-repository.js'

function truncate(date: Date, bucketBy: 'daily' | 'weekly' | 'monthly'): Date {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  if (bucketBy === 'daily') return d
  if (bucketBy === 'weekly') {
    const day = d.getUTCDay()
    d.setUTCDate(d.getUTCDate() - day)
    return d
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
}

function nextBucket(
  date: Date,
  bucketBy: 'daily' | 'weekly' | 'monthly',
): Date {
  const d = new Date(date)
  if (bucketBy === 'daily') d.setUTCDate(d.getUTCDate() + 1)
  else if (bucketBy === 'weekly') d.setUTCDate(d.getUTCDate() + 7)
  else d.setUTCMonth(d.getUTCMonth() + 1)
  return d
}

export class InMemoryDashboardRepository implements DashboardRepository {
  public users: User[] = []
  public matchesCount = 0
  public playsCount = 0
  public achievementsCount = 0
  public activeSubscriptionsCount = 0
  public matchesCreatedAt: Date[] = []
  public playsCreatedAt: Date[] = []

  async getTotals(): Promise<DashboardTotals> {
    return {
      athletes: this.users.filter((u) => u.role === 'ATHLETE').length,
      observers: this.users.filter((u) => u.role === 'OBSERVER').length,
      matches: this.matchesCount,
      plays: this.playsCount,
      achievements: this.achievementsCount,
      activeSubscriptions: this.activeSubscriptionsCount,
    }
  }

  async countNewInPeriod(
    from: Date,
    to: Date,
  ): Promise<DashboardPeriodCounts> {
    const inRange = (d: Date) => d >= from && d <= to
    return {
      newAthletes: this.users.filter(
        (u) => u.role === 'ATHLETE' && inRange(u.createdAt),
      ).length,
      newObservers: this.users.filter(
        (u) => u.role === 'OBSERVER' && inRange(u.createdAt),
      ).length,
      newMatches: this.matchesCreatedAt.filter(inRange).length,
      newPlays: this.playsCreatedAt.filter(inRange).length,
    }
  }

  async getUserGrowthSeries(
    from: Date,
    to: Date,
    bucketBy: 'daily' | 'weekly' | 'monthly',
  ): Promise<UserGrowthBucket[]> {
    const map = new Map<string, UserGrowthBucket>()
    let cursor = truncate(from, bucketBy)
    const end = truncate(to, bucketBy)
    while (cursor.getTime() <= end.getTime()) {
      map.set(cursor.toISOString(), {
        bucket: new Date(cursor),
        newAthletes: 0,
        newObservers: 0,
        total: 0,
      })
      cursor = nextBucket(cursor, bucketBy)
    }

    for (const u of this.users) {
      if (u.createdAt < from || u.createdAt > to) continue
      const key = truncate(u.createdAt, bucketBy).toISOString()
      const entry = map.get(key)
      if (!entry) continue
      entry.total += 1
      if (u.role === 'ATHLETE') entry.newAthletes += 1
      else if (u.role === 'OBSERVER') entry.newObservers += 1
    }

    return Array.from(map.values()).sort(
      (a, b) => a.bucket.getTime() - b.bucket.getTime(),
    )
  }

  async getUserActivity(now: Date): Promise<UserActivityCounts> {
    const d7 = new Date(now)
    d7.setDate(d7.getDate() - 7)
    const d30 = new Date(now)
    d30.setDate(d30.getDate() - 30)
    const d90 = new Date(now)
    d90.setDate(d90.getDate() - 90)

    return {
      total: this.users.length,
      activeLast7d: this.users.filter(
        (u) => u.lastLoginAt && u.lastLoginAt >= d7,
      ).length,
      activeLast30d: this.users.filter(
        (u) => u.lastLoginAt && u.lastLoginAt >= d30,
      ).length,
      activeLast90d: this.users.filter(
        (u) => u.lastLoginAt && u.lastLoginAt >= d90,
      ).length,
      inactiveOver30d: this.users.filter(
        (u) => u.lastLoginAt && u.lastLoginAt < d30,
      ).length,
      inactiveOver90d: this.users.filter(
        (u) => u.lastLoginAt && u.lastLoginAt < d90,
      ).length,
      neverLoggedIn: this.users.filter((u) => !u.lastLoginAt).length,
    }
  }

  async getInactivityBuckets(now: Date): Promise<InactivityBucket[]> {
    const ranges: Array<{
      label: string
      minDays: number | null
      maxDays: number | null
    }> = [
      { label: '0-7d', minDays: 0, maxDays: 7 },
      { label: '7-30d', minDays: 7, maxDays: 30 },
      { label: '30-90d', minDays: 30, maxDays: 90 },
      { label: '90-180d', minDays: 90, maxDays: 180 },
      { label: '180d+', minDays: 180, maxDays: null },
      { label: 'never', minDays: null, maxDays: null },
    ]

    return ranges.map((r) => {
      if (r.label === 'never') {
        return {
          ...r,
          count: this.users.filter((u) => !u.lastLoginAt).length,
        }
      }
      const max = r.maxDays
      const min = r.minDays ?? 0
      const count = this.users.filter((u) => {
        if (!u.lastLoginAt) return false
        const daysAgo =
          (now.getTime() - u.lastLoginAt.getTime()) / (24 * 3600 * 1000)
        if (daysAgo < min) return false
        if (max !== null && daysAgo >= max) return false
        return true
      }).length
      return { ...r, count }
    })
  }
}
