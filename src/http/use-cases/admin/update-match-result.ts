import type {
  Match,
  MatchResult,
  MatchStatus,
} from '../../../../generated/prisma/client.js'
import type { MatchRepository } from '../../repositories/match-repository.js'
import { MatchNotFoundError } from '../get-match.js'

interface Input {
  matchId: string
  myTeamScore?: number
  adversaryScore?: number
  result?: MatchResult
  status?: MatchStatus
}

function deriveResult(myScore: number, adversaryScore: number): MatchResult {
  if (myScore > adversaryScore) return 'WIN'
  if (myScore < adversaryScore) return 'LOSS'
  return 'DRAW'
}

export class UpdateMatchResultAdminUseCase {
  constructor(private matchRepository: MatchRepository) {}

  async execute(input: Input): Promise<Match> {
    const match = await this.matchRepository.findById(input.matchId)
    if (!match) throw new MatchNotFoundError()

    const myTeamScore = input.myTeamScore ?? match.myTeamScore
    const adversaryScore = input.adversaryScore ?? match.adversaryScore

    let finalResult = input.result
    if (
      !finalResult &&
      myTeamScore !== null &&
      myTeamScore !== undefined &&
      adversaryScore !== null &&
      adversaryScore !== undefined
    ) {
      finalResult = deriveResult(myTeamScore, adversaryScore)
    }

    return this.matchRepository.update(input.matchId, {
      ...(input.myTeamScore !== undefined
        ? { myTeamScore: input.myTeamScore }
        : {}),
      ...(input.adversaryScore !== undefined
        ? { adversaryScore: input.adversaryScore }
        : {}),
      ...(finalResult !== undefined ? { result: finalResult } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    })
  }
}

export { MatchNotFoundError }
