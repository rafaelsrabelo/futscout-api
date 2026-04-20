import type { AthleteProfileRepository } from '../../repositories/athlete-profile-repository.js'
import type {
  TeamHistoryRepository,
  TeamHistoryWithTeam,
} from '../../repositories/team-history-repository.js'
import { AthleteNotFoundError } from './list-athlete-matches.js'

interface Input {
  athleteProfileId: string
}

interface Output {
  items: TeamHistoryWithTeam[]
  currentTeam: TeamHistoryWithTeam | null
}

export class ListAthleteTeamHistoryAdminUseCase {
  constructor(
    private teamHistoryRepository: TeamHistoryRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute({ athleteProfileId }: Input): Promise<Output> {
    const athlete =
      await this.athleteProfileRepository.findById(athleteProfileId)
    if (!athlete) throw new AthleteNotFoundError()

    const items =
      await this.teamHistoryRepository.findManyWithTeamByAthlete(
        athleteProfileId,
      )

    const currentTeam = items.find((i) => i.endDate === null) ?? null

    return { items, currentTeam }
  }
}
