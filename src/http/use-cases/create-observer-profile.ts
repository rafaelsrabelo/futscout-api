import { prisma } from '../../lib/prisma.js'
import type { ObserverProfileRepository } from '../repositories/observer-profile-repository.js'

interface CreateObserverProfileRequest {
  userId: string
  currentClub?: string | undefined
  phone: string
  profilePhoto?: string | undefined
}

interface CreateObserverProfileResponse {
  observerProfile: {
    id: string
    userId: string
    currentClub: string | null
    phone: string
    profilePhoto: string | null
    createdAt: Date
    updatedAt: Date
  }
}

export class CreateObserverProfileUseCase {
  constructor(private observerProfileRepository: ObserverProfileRepository) {}

  async execute({
    userId,
    currentClub,
    phone,
    profilePhoto,
  }: CreateObserverProfileRequest): Promise<CreateObserverProfileResponse> {
    const observerProfile = await this.observerProfileRepository.create({
      userId,
      phone,
      ...(currentClub && { currentClub }),
      ...(profilePhoto && { profilePhoto }),
    })

    // O nome já foi definido no cadastro — aqui só marcamos o perfil como completo.
    await prisma.user.update({
      where: { id: userId },
      data: { isProfile: true },
    })

    return {
      observerProfile,
    }
  }
}
