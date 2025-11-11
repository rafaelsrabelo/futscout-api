import type { ObserverProfileRepository } from '../repositories/observer-profile-repository.js'
import { ObserverProfileNotFoundError } from './errors/observer-profile-not-found-error.js'

interface GetObserverProfileRequest {
  userId: string
}

interface GetObserverProfileResponse {
  observerProfile: {
    id: string
    userId: string
    cpf: string
    name: string
    currentClub: string | null
    phone: string
    profilePhoto: string | null
    createdAt: Date
    updatedAt: Date
  }
}

export class GetObserverProfileUseCase {
  constructor(private observerProfileRepository: ObserverProfileRepository) {}

  async execute({
    userId,
  }: GetObserverProfileRequest): Promise<GetObserverProfileResponse> {
    const observerProfile =
      await this.observerProfileRepository.findByUserId(userId)

    if (!observerProfile) {
      throw new ObserverProfileNotFoundError()
    }

    return {
      observerProfile,
    }
  }
}
