import type { ObserverProfileRepository } from '../repositories/observer-profile-repository.js'
import { ObserverProfileNotFoundError } from './errors/observer-profile-not-found-error.js'

interface UpdateObserverProfileRequest {
  userId: string
  name?: string
  currentClub?: string
  phone?: string
  profilePhoto?: string
}

interface UpdateObserverProfileResponse {
  observerProfile: {
    id: string
    userId: string
    name: string
    currentClub: string | null
    phone: string
    profilePhoto: string | null
    createdAt: Date
    updatedAt: Date
  }
}

export class UpdateObserverProfileUseCase {
  constructor(private observerProfileRepository: ObserverProfileRepository) {}

  async execute({
    userId,
    name,
    currentClub,
    phone,
    profilePhoto,
  }: UpdateObserverProfileRequest): Promise<UpdateObserverProfileResponse> {
    const existingProfile =
      await this.observerProfileRepository.findByUserId(userId)

    if (!existingProfile) {
      throw new ObserverProfileNotFoundError()
    }

    const updateData = {
      ...(name && { name }),
      ...(currentClub && { currentClub }),
      ...(phone && { phone }),
      ...(profilePhoto && { profilePhoto }),
    }

    const observerProfile = await this.observerProfileRepository.update(
      existingProfile.id,
      updateData,
    )

    return {
      observerProfile,
    }
  }
}
