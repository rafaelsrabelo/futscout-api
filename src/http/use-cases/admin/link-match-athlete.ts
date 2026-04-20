import type { Match } from '../../../../generated/prisma/client.js'
import type { AthleteProfileRepository } from '../../repositories/athlete-profile-repository.js'
import type { MatchRepository } from '../../repositories/match-repository.js'
import { MatchNotFoundError } from '../get-match.js'
import { AthleteNotFoundError } from './list-athlete-matches.js'

interface Input {
  matchId: string
  athleteProfileId: string
}

export class LinkMatchAthleteAdminUseCase {
  constructor(
    private matchRepository: MatchRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute({ matchId, athleteProfileId }: Input): Promise<Match> {
    const match = await this.matchRepository.findById(matchId)
    if (!match) throw new MatchNotFoundError()

    const athlete =
      await this.athleteProfileRepository.findById(athleteProfileId)
    if (!athlete) throw new AthleteNotFoundError()

    return this.matchRepository.update(matchId, {
      athlete: { connect: { id: athleteProfileId } },
    })
  }
}

export { MatchNotFoundError, AthleteNotFoundError }
