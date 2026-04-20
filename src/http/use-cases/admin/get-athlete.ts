import type {
  AthleteAdminDetail,
  AthleteProfileRepository,
  PlaysByTypeEntry,
} from '../../repositories/athlete-profile-repository.js'
import { AthleteNotFoundError } from './errors/athlete-not-found-error.js'

export interface GetAthleteAdminUseCaseRequest {
  athleteProfileId: string
}

export interface GetAthleteAdminUseCaseResponse extends AthleteAdminDetail {
  playsByType: PlaysByTypeEntry[]
}

export class GetAthleteAdminUseCase {
  constructor(
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute({
    athleteProfileId,
  }: GetAthleteAdminUseCaseRequest): Promise<GetAthleteAdminUseCaseResponse> {
    const [detail, playsByType] = await Promise.all([
      this.athleteProfileRepository.findByIdForAdmin(athleteProfileId),
      this.athleteProfileRepository.countPlaysByTypeForAthlete(
        athleteProfileId,
      ),
    ])

    if (!detail) {
      throw new AthleteNotFoundError()
    }

    return {
      ...detail,
      playsByType,
    }
  }
}
