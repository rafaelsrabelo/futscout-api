import { prisma } from '../../lib/prisma.js'
import type { ObserverProfileRepository } from '../repositories/observer-profile-repository.js'

interface CreateObserverProfileRequest {
  userId: string
  name: string
  currentClub?: string | undefined
  phone: string
  profilePhoto?: string | undefined
}

interface CreateObserverProfileResponse {
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

export class CreateObserverProfileUseCase {
  constructor(private observerProfileRepository: ObserverProfileRepository) {}

  async execute({
    userId,
    name,
    currentClub,
    phone,
    profilePhoto,
  }: CreateObserverProfileRequest): Promise<CreateObserverProfileResponse> {
    const observerProfile = await this.observerProfileRepository.create({
      userId,
      name,
      phone,
      ...(currentClub && { currentClub }),
      ...(profilePhoto && { profilePhoto }),
    })

    await prisma.user.update({
      where: { id: userId },
      data: {
        isProfile: true,
        name, // Sincroniza o nome do perfil com o nome do usuário
      },
    })

    return {
      observerProfile,
    }
  }
}
