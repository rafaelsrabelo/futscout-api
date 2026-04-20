export interface DashboardTotals {
  athletes: number
  observers: number
  matches: number
  plays: number
  achievements: number
  activeSubscriptions: number
}

export interface DashboardPeriodCounts {
  newAthletes: number
  newObservers: number
  newMatches: number
  newPlays: number
}

export interface UserGrowthBucket {
  bucket: Date
  newAthletes: number
  newObservers: number
  total: number
}

export interface UserActivityCounts {
  total: number
  activeLast7d: number
  activeLast30d: number
  activeLast90d: number
  inactiveOver30d: number
  inactiveOver90d: number
  neverLoggedIn: number
}

export interface InactivityBucket {
  label: string
  minDays: number | null
  maxDays: number | null
  count: number
}

export interface DashboardRepository {
  getTotals(): Promise<DashboardTotals>
  countNewInPeriod(from: Date, to: Date): Promise<DashboardPeriodCounts>
  getUserGrowthSeries(
    from: Date,
    to: Date,
    bucketBy: 'daily' | 'weekly' | 'monthly',
  ): Promise<UserGrowthBucket[]>
  getUserActivity(now: Date): Promise<UserActivityCounts>
  getInactivityBuckets(now: Date): Promise<InactivityBucket[]>
}
