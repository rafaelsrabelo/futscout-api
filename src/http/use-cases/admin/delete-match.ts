import type { MatchRepository } from '../../repositories/match-repository.js'
import { MatchNotFoundError } from '../get-match.js'

interface Input {
  matchId: string
}

export class DeleteMatchAdminUseCase {
  constructor(private matchRepository: MatchRepository) {}

  async execute({ matchId }: Input): Promise<void> {
    const match = await this.matchRepository.findById(matchId)
    if (!match) throw new MatchNotFoundError()

    await this.matchRepository.delete(matchId)
  }
}

export { MatchNotFoundError }
