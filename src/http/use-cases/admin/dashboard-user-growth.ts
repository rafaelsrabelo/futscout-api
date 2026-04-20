import type {
  DashboardRepository,
  UserGrowthBucket,
} from '../../repositories/dashboard-repository.js'

interface Input {
  period?: 'daily' | 'weekly' | 'monthly'
  from?: Date
  to?: Date
}

export interface DashboardUserGrowthOutput {
  period: 'daily' | 'weekly' | 'monthly'
  from: Date
  to: Date
  series: UserGrowthBucket[]
}

export class RangeTooLargeError extends Error {
  constructor() {
    super('Max range for user growth is 365 days.')
    this.name = 'RangeTooLargeError'
  }
}

export class DashboardUserGrowthUseCase {
  constructor(private dashboardRepository: DashboardRepository) {}

  async execute(input: Input): Promise<DashboardUserGrowthOutput> {
    const period = input.period ?? 'daily'
    const to = input.to ?? new Date()
    const from = input.from ?? (() => {
      const d = new Date(to)
      d.setDate(d.getDate() - 30)
      return d
    })()

    const diffDays = (to.getTime() - from.getTime()) / (24 * 3600 * 1000)
    if (diffDays > 365) {
      throw new RangeTooLargeError()
    }

    const series = await this.dashboardRepository.getUserGrowthSeries(
      from,
      to,
      period,
    )

    return { period, from, to, series }
  }
}
