import { prisma } from '../../lib/prisma.js'
import type { ObserverProfileRepository } from '../repositories/observer-profile-repository.js'
import { ObserverProfileNotFoundError } from './errors/observer-profile-not-found-error.js'

interface UpdateObserverProfileRequest {
  userId: string
  name?: string
  currentClub?: string
  phone?: string
  profilePhoto?: string
  notifyOnFavoriteActivity?: boolean
}

interface UpdateObserverProfileResponse {
  observerProfile: {
    id: string
    userId: string
    currentClub: string | null
    phone: string
    profilePhoto: string | null
    notifyOnFavoriteActivity: boolean
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
    notifyOnFavoriteActivity,
  }: UpdateObserverProfileRequest): Promise<UpdateObserverProfileResponse> {
    const existingProfile =
      await this.observerProfileRepository.findByUserId(userId)

    if (!existingProfile) {
      throw new ObserverProfileNotFoundError()
    }

    const updateData = {
      ...(currentClub && { currentClub }),
      ...(phone && { phone }),
      ...(profilePhoto && { profilePhoto }),
      // `!== undefined` e não truthy: `false` é um valor válido aqui.
      ...(notifyOnFavoriteActivity !== undefined && {
        notifyOnFavoriteActivity,
      }),
    }

    const observerProfile = await this.observerProfileRepository.update(
      existingProfile.id,
      updateData,
    )

    // O nome mora em `users.name` — editá-lo aqui atualiza a fonte única.
    if (name) {
      await prisma.user.update({
        where: { id: userId },
        data: { name },
      })
    }

    return {
      observerProfile,
    }
  }
}
