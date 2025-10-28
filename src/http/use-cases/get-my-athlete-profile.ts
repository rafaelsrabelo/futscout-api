import type { AthleteProfileRepository } from '../repositories/athlete-profile-repository.js'
import type { AthleteProfile } from 'generated/prisma/client.js'

interface GetMyAthleteProfileUseCaseRequest {
  userId: string
}

interface GetMyAthleteProfileUseCaseResponse {
  profile: AthleteProfile
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
