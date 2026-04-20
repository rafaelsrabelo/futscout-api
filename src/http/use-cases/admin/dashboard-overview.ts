import type { DashboardRepository } from '../../repositories/dashboard-repository.js'

interface Input {
  periodDays?: number
}

export interface DashboardOverviewOutput {
  totals: {
    athletes: number
    observers: number
    matches: number
    plays: number
    achievements: number
    activeSubscriptions: number
  }
  period: {
    days: number
    from: Date
    to: Date
    newAthletes: number
    newObservers: number
    newMatches: number
    newPlays: number
  }
}

export class DashboardOverviewUseCase {
  constructor(private dashboardRepository: DashboardRepository) {}

  async execute({ periodDays = 30 }: Input): Promise<DashboardOverviewOutput> {
    const to = new Date()
    const from = new Date(to)
    from.setDate(from.getDate() - periodDays)

    const [totals, period] = await Promise.all([
      this.dashboardRepository.getTotals(),
      this.dashboardRepository.countNewInPeriod(from, to),
    ])

    return {
      totals,
      period: {
        days: periodDays,
        from,
        to,
        ...period,
      },
    }
  }
}
