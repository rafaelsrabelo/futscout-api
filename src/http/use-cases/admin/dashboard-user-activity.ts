import type {
  DashboardRepository,
  UserActivityCounts,
} from '../../repositories/dashboard-repository.js'

export interface DashboardUserActivityOutput extends UserActivityCounts {
  activePercent30d: number
}

export class DashboardUserActivityUseCase {
  constructor(private dashboardRepository: DashboardRepository) {}

  async execute(): Promise<DashboardUserActivityOutput> {
    const counts = await this.dashboardRepository.getUserActivity(new Date())

    const activePercent30d =
      counts.total > 0
        ? Math.round((counts.activeLast30d / counts.total) * 10000) / 100
        : 0

    return { ...counts, activePercent30d }
  }
}
