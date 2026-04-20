import type {
  AdminAthleteSearchResult,
  AthleteProfileRepository,
} from '../../repositories/athlete-profile-repository.js'
import type {
  AdminMatchSearchResult,
  MatchRepository,
} from '../../repositories/match-repository.js'

interface Input {
  q: string
  limit?: number
}

interface Output {
  athletes: AdminAthleteSearchResult[]
  matches: AdminMatchSearchResult[]
}

export class SearchAdminUseCase {
  constructor(
    private athleteProfileRepository: AthleteProfileRepository,
    private matchRepository: MatchRepository,
  ) {}

  async execute({ q, limit }: Input): Promise<Output> {
    const pageLimit = limit ?? 5

    const [athletes, matches] = await Promise.all([
      this.athleteProfileRepository.searchByTerm(q, pageLimit),
      this.matchRepository.searchByTerm(q, pageLimit),
    ])

    return { athletes, matches }
  }
}
