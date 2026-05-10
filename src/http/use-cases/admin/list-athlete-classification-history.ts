import type {
  AthleteClassificationLogRepository,
  AthleteClassificationLogWithAdmin,
} from '../../repositories/athlete-classification-log-repository.js'
import type { AthleteProfileRepository } from '../../repositories/athlete-profile-repository.js'

import { AthleteNotFoundError } from './errors/athlete-not-found-error.js'

export interface ListAthleteClassificationHistoryUseCaseRequest {
  athleteProfileId: string
  page?: number
  pageSize?: number
}

export interface ListAthleteClassificationHistoryUseCaseResponse {
  items: AthleteClassificationLogWithAdmin[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

export class ListAthleteClassificationHistoryUseCase {
  constructor(
    private athleteProfileRepository: AthleteProfileRepository,
    private classificationLogRepository: AthleteClassificationLogRepository,
  ) {}

  async execute(
    request: ListAthleteClassificationHistoryUseCaseRequest,
  ): Promise<ListAthleteClassificationHistoryUseCaseResponse> {
    const { athleteProfileId, page = 1, pageSize = 20 } = request

    const profile =
      await this.athleteProfileRepository.findById(athleteProfileId)
    if (!profile) {
      throw new AthleteNotFoundError()
    }

    const { items, total } =
      await this.classificationLogRepository.listByAthleteId(athleteProfileId, {
        page,
        pageSize,
      })

    return {
      items,
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
    }
  }
}
