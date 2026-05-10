import type {
  AthleteClassificationLog,
  AthleteProfile,
} from 'generated/prisma/client.js'

import type { AthleteClassificationLogRepository } from '../../repositories/athlete-classification-log-repository.js'
import type { AthleteProfileRepository } from '../../repositories/athlete-profile-repository.js'

import { AthleteNotFoundError } from './errors/athlete-not-found-error.js'

export type AthleteClassificationInput =
  | 'DESENVOLVIMENTO'
  | 'PERFORMANCE'
  | null

export interface SetAthleteClassificationUseCaseRequest {
  athleteProfileId: string
  classification: AthleteClassificationInput
  comment?: string | null
  adminUserId: string
}

export interface SetAthleteClassificationUseCaseResponse {
  athleteProfile: AthleteProfile
  log: AthleteClassificationLog
}

export class SetAthleteClassificationUseCase {
  constructor(
    private athleteProfileRepository: AthleteProfileRepository,
    private classificationLogRepository: AthleteClassificationLogRepository,
  ) {}

  async execute(
    request: SetAthleteClassificationUseCaseRequest,
  ): Promise<SetAthleteClassificationUseCaseResponse> {
    const profile = await this.athleteProfileRepository.findById(
      request.athleteProfileId,
    )
    if (!profile) {
      throw new AthleteNotFoundError()
    }

    const log = await this.classificationLogRepository.create({
      athleteId: profile.id,
      classification: request.classification,
      comment: request.comment ?? null,
      classifiedById: request.adminUserId,
    })

    const updated = await this.athleteProfileRepository.update(profile.userId, {
      classification: request.classification,
    })

    return { athleteProfile: updated, log }
  }
}
