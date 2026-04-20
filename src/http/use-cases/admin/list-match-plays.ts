import type {
  Play,
  PlayClassifications,
} from '../../../../generated/prisma/client.js'
import type { MatchRepository } from '../../repositories/match-repository.js'
import type { PlayRepository } from '../../repositories/play-repository.js'
import { MatchNotFoundError } from '../get-match.js'

interface Input {
  matchId: string
}

type MatchPlayItem = Play & { classifications: PlayClassifications[] }

interface Output {
  items: MatchPlayItem[]
}

export class ListMatchPlaysAdminUseCase {
  constructor(
    private playRepository: PlayRepository,
    private matchRepository: MatchRepository,
  ) {}

  async execute({ matchId }: Input): Promise<Output> {
    const match = await this.matchRepository.findById(matchId)
    if (!match) throw new MatchNotFoundError()

    const items = (await this.playRepository.findManyByMatchId(matchId)) as MatchPlayItem[]
    return { items }
  }
}

export { MatchNotFoundError }
