import type {
  AdminMatchDetail,
  MatchRepository,
} from '../../repositories/match-repository.js'
import { MatchNotFoundError } from '../get-match.js'

interface Input {
  matchId: string
}

export class GetMatchAdminUseCase {
  constructor(private matchRepository: MatchRepository) {}

  async execute({ matchId }: Input): Promise<AdminMatchDetail> {
    const match = await this.matchRepository.findByIdForAdmin(matchId)
    if (!match) throw new MatchNotFoundError()
    return match
  }
}

export { MatchNotFoundError }
