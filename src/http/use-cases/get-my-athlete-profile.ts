import type { AthleteProfileRepository } from '../repositories/athlete-profile-repository.js'
import type { AthleteProfile, Address } from 'generated/prisma/client.js'

interface GetMyAthleteProfileUseCaseRequest {
  userId: string
}

interface GetMyAthleteProfileUseCaseResponse {
  profile: AthleteProfile & {
    address: Address | null
  }
}

export class GetMyAthleteProfileUseCase {
  constructor(private athleteProfileRepository: AthleteProfileRepository) {}

  async execute({
    userId,
  }: GetMyAthleteProfileUseCaseRequest): Promise<GetMyAthleteProfileUseCaseResponse> {
    const profile = await this.athleteProfileRepository.findByUserId(userId)

    if (!profile) {
      throw new Error('Athlete profile not found')
    }

    return {
      profile,
    }
  }
}
