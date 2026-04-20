import { prisma } from '../../../lib/prisma.js'
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

export class PrismaDashboardRepository implements DashboardRepository {
  async getTotals(): Promise<DashboardTotals> {
    const [
      athletes,
      observers,
      matches,
      plays,
      achievements,
      activeSubscriptions,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'ATHLETE' } }),
      prisma.user.count({ where: { role: 'OBSERVER' } }),
      prisma.match.count(),
      prisma.play.count(),
      prisma.achievement.count(),
      prisma.subscription.count({ where: { status: 'active' } }),
    ])
    return {
      athletes,
      observers,
      matches,
      plays,
      achievements,
      activeSubscriptions,
    }
  }

  async countNewInPeriod(
    from: Date,
    to: Date,
  ): Promise<DashboardPeriodCounts> {
    const [newAthletes, newObservers, newMatches, newPlays] = await Promise.all(
      [
        prisma.user.count({
          where: { role: 'ATHLETE', createdAt: { gte: from, lte: to } },
        }),
        prisma.user.count({
          where: { role: 'OBSERVER', createdAt: { gte: from, lte: to } },
        }),
        prisma.match.count({ where: { createdAt: { gte: from, lte: to } } }),
        prisma.play.count({ where: { createdAt: { gte: from, lte: to } } }),
      ],
    )
    return { newAthletes, newObservers, newMatches, newPlays }
  }

  async getUserGrowthSeries(
    from: Date,
    to: Date,
    bucketBy: 'daily' | 'weekly' | 'monthly',
  ): Promise<UserGrowthBucket[]> {
    const users = await prisma.user.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { role: true, createdAt: true },
    })

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

    for (const u of users) {
      const bucketKey = truncate(u.createdAt, bucketBy).toISOString()
      const entry = map.get(bucketKey)
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

    const [
      total,
      activeLast7d,
      activeLast30d,
      activeLast90d,
      inactiveOver30d,
      inactiveOver90d,
      neverLoggedIn,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { lastLoginAt: { gte: d7 } } }),
      prisma.user.count({ where: { lastLoginAt: { gte: d30 } } }),
      prisma.user.count({ where: { lastLoginAt: { gte: d90 } } }),
      prisma.user.count({ where: { lastLoginAt: { lt: d30 } } }),
      prisma.user.count({ where: { lastLoginAt: { lt: d90 } } }),
      prisma.user.count({ where: { lastLoginAt: null } }),
    ])

    return {
      total,
      activeLast7d,
      activeLast30d,
      activeLast90d,
      inactiveOver30d,
      inactiveOver90d,
      neverLoggedIn,
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

    const results: InactivityBucket[] = []

    for (const r of ranges) {
      if (r.label === 'never') {
        const count = await prisma.user.count({
          where: { lastLoginAt: null },
        })
        results.push({ ...r, count })
        continue
      }
      const min = r.minDays ?? 0
      const max = r.maxDays
      const gteDate = new Date(now)
      gteDate.setDate(gteDate.getDate() - (max ?? 10_000))
      const lteDate = new Date(now)
      lteDate.setDate(lteDate.getDate() - min)

      const where: {
        lastLoginAt?: { gte?: Date; lt?: Date; not?: null }
      } = { lastLoginAt: {} }
      if (max !== null) where.lastLoginAt!.gte = gteDate
      where.lastLoginAt!.lt = lteDate

      const count = await prisma.user.count({ where })
      results.push({ ...r, count })
    }

    return results
  }
}
