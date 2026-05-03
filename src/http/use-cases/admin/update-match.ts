import type {
  Category,
  Match,
  MatchResult,
  MatchStatus,
  Modality,
  PlayerPosition,
  Prisma,
} from '../../../../generated/prisma/client.js'
import type { AthleteProfileRepository } from '../../repositories/athlete-profile-repository.js'
import type { MatchRepository } from '../../repositories/match-repository.js'

import { AthleteNotFoundError } from './errors/athlete-not-found-error.js'
import { MatchNotFoundError } from '../get-match.js'

export interface UpdateMatchAdminUseCaseRequest {
  matchId: string
  athleteProfileId?: string
  myTeamId?: string
  adversaryTeam?: string
  date?: Date
  modality?: Modality
  category?: Category
  location?: string
  streamUrl?: string | null
  competitionId?: string | null
  status?: MatchStatus
  result?: MatchResult
  myTeamScore?: number | null
  adversaryScore?: number | null
  playerPosition?: PlayerPosition | null
  observations?: string | null
  matchDuration?: number | null
  approximateTime?: number | null
  photoUrl?: string | null
  videoUrl?: string | null
  youtubeUrl?: string | null
  performanceRating?: number | null
}

function deriveResult(myScore: number, adversaryScore: number): MatchResult {
  if (myScore > adversaryScore) return 'WIN'
  if (myScore < adversaryScore) return 'LOSS'
  return 'DRAW'
}

export class UpdateMatchAdminUseCase {
  constructor(
    private matchRepository: MatchRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute(input: UpdateMatchAdminUseCaseRequest): Promise<Match> {
    const match = await this.matchRepository.findById(input.matchId)
    if (!match) throw new MatchNotFoundError()

    if (input.athleteProfileId) {
      const athlete = await this.athleteProfileRepository.findById(
        input.athleteProfileId,
      )
      if (!athlete) throw new AthleteNotFoundError()
    }

    const data: Prisma.MatchUpdateInput = {}

    if (input.athleteProfileId !== undefined) {
      data.athlete = { connect: { id: input.athleteProfileId } }
    }
    if (input.myTeamId !== undefined) {
      data.myTeam = { connect: { id: input.myTeamId } }
    }
    if (input.competitionId !== undefined) {
      data.competition =
        input.competitionId === null
          ? { disconnect: true }
          : { connect: { id: input.competitionId } }
    }

    if (input.adversaryTeam !== undefined)
      data.adversaryTeam = input.adversaryTeam
    if (input.date !== undefined) data.date = input.date
    if (input.modality !== undefined) data.modality = input.modality
    if (input.category !== undefined) data.category = input.category
    if (input.location !== undefined) data.location = input.location
    if (input.streamUrl !== undefined) data.streamUrl = input.streamUrl
    if (input.status !== undefined) data.status = input.status
    if (input.myTeamScore !== undefined) data.myTeamScore = input.myTeamScore
    if (input.adversaryScore !== undefined)
      data.adversaryScore = input.adversaryScore
    if (input.playerPosition !== undefined)
      data.playerPosition = input.playerPosition
    if (input.observations !== undefined) data.observations = input.observations
    if (input.matchDuration !== undefined)
      data.matchDuration = input.matchDuration
    if (input.approximateTime !== undefined)
      data.approximateTime = input.approximateTime
    if (input.photoUrl !== undefined) data.photoUrl = input.photoUrl
    if (input.videoUrl !== undefined) data.videoUrl = input.videoUrl
    if (input.youtubeUrl !== undefined) data.youtubeUrl = input.youtubeUrl
    if (input.performanceRating !== undefined)
      data.performanceRating = input.performanceRating

    // Se não veio result explícito, mas vieram scores, deriva igual ao update-match-result
    let finalResult = input.result
    const myTeamScore = input.myTeamScore ?? match.myTeamScore
    const adversaryScore = input.adversaryScore ?? match.adversaryScore
    if (
      finalResult === undefined &&
      (input.myTeamScore !== undefined || input.adversaryScore !== undefined) &&
      myTeamScore !== null &&
      myTeamScore !== undefined &&
      adversaryScore !== null &&
      adversaryScore !== undefined
    ) {
      finalResult = deriveResult(myTeamScore, adversaryScore)
    }
    if (finalResult !== undefined) {
      data.result = finalResult
    }

    return this.matchRepository.update(input.matchId, data)
  }
}

export { MatchNotFoundError, AthleteNotFoundError }
