import { prisma } from '@/lib/prisma.js'

type AthleteForList = {
  id: string
  userId: string
  [key: string]: unknown
}

export type EnrichedAthlete<T extends AthleteForList> = T & {
  favorites: number
  isFavorite: boolean
  isPremium: boolean
}

async function getPremiumUserIds(userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set()
  const subs = await prisma.subscription.findMany({
    where: {
      userId: { in: userIds },
      status: 'active',
      currentPeriodEnd: { gte: new Date() },
      plan: { name: 'PREMIUM' },
    },
    select: { userId: true },
  })
  return new Set(subs.map((s) => s.userId))
}

async function getFavoritesCountByAthlete(
  athleteIds: string[],
): Promise<Map<string, number>> {
  if (athleteIds.length === 0) return new Map()
  const grouped = await prisma.favorite.groupBy({
    by: ['athleteId'],
    where: { athleteId: { in: athleteIds } },
    _count: { athleteId: true },
  })
  return new Map(grouped.map((g) => [g.athleteId, g._count.athleteId]))
}

async function getFavoritedByUser(
  userId: string,
  athleteIds: string[],
): Promise<Set<string>> {
  if (athleteIds.length === 0) return new Set()
  const favs = await prisma.favorite.findMany({
    where: { userId, athleteId: { in: athleteIds } },
    select: { athleteId: true },
  })
  return new Set(favs.map((f) => f.athleteId))
}

export async function enrichAthletesWithFlags<T extends AthleteForList>(
  athletes: T[],
  currentUserId?: string,
): Promise<EnrichedAthlete<T>[]> {
  const athleteIds = athletes.map((a) => a.id)
  const userIds = athletes.map((a) => a.userId)

  const [favoritesCount, premiumUserIds, favoritedSet] = await Promise.all([
    getFavoritesCountByAthlete(athleteIds),
    getPremiumUserIds(userIds),
    currentUserId
      ? getFavoritedByUser(currentUserId, athleteIds)
      : Promise.resolve(new Set<string>()),
  ])

  return athletes.map((athlete) => ({
    ...athlete,
    favorites: favoritesCount.get(athlete.id) ?? 0,
    isFavorite: favoritedSet.has(athlete.id),
    isPremium: premiumUserIds.has(athlete.userId),
  }))
}

export function sortByPremiumAndDate<
  T extends { isPremium: boolean; createdAt: Date | string },
>(athletes: T[]): T[] {
  return [...athletes].sort((a, b) => {
    if (a.isPremium !== b.isPremium) return a.isPremium ? -1 : 1
    const dateA = new Date(a.createdAt).getTime()
    const dateB = new Date(b.createdAt).getTime()
    return dateB - dateA
  })
}
