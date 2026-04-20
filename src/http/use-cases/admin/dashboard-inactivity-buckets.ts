import type {
  DashboardRepository,
  InactivityBucket,
} from '../../repositories/dashboard-repository.js'

export interface DashboardInactivityBucketsOutput {
  buckets: InactivityBucket[]
  total: number
}

export class DashboardInactivityBucketsUseCase {
  constructor(private dashboardRepository: DashboardRepository) {}

  async execute(): Promise<DashboardInactivityBucketsOutput> {
    const buckets = await this.dashboardRepository.getInactivityBuckets(
      new Date(),
    )
    const total = buckets.reduce((acc, b) => acc + b.count, 0)
    return { buckets, total }
  }
}
