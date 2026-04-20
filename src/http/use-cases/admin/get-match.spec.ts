import type { Match } from 'generated/prisma/client.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryMatchRepository } from '../../repositories/in-memory/in-memory-match-repository.js'
import {
  GetMatchAdminUseCase,
  MatchNotFoundError,
} from './get-match.js'

let matchRepository: InMemoryMatchRepository
let sut: GetMatchAdminUseCase

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: overrides.id ?? 'match-1',
    athleteId: overrides.athleteId ?? 'athlete-1',
    myTeamId: overrides.myTeamId ?? 'team-1',
    adversaryTeam: overrides.adversaryTeam ?? 'Rival FC',
    date: overrides.date ?? new Date('2025-05-01'),
    modality: overrides.modality ?? 'FUT_11',
    category: overrides.category ?? 'PROFESSIONAL',
    location: overrides.location ?? 'Estádio',
    streamUrl: null,
    competitionId: overrides.competitionId ?? null,
    status: 'FINISHED',
    result: 'WIN',
    myTeamScore: 2,
    adversaryScore: 1,
    playerPosition: 'STARTER',
    observations: null,
    matchDuration: 90,
    approximateTime: 90,
    photoUrl: null,
    videoUrl: null,
    youtubeUrl: null,
    performanceRating: null,
    createdAt: new Date('2025-05-01'),
    updatedAt: new Date('2025-05-01'),
  }
}

beforeEach(() => {
  matchRepository = new InMemoryMatchRepository()
  sut = new GetMatchAdminUseCase(matchRepository)
})

describe('Get Match Admin Use Case', () => {
  it('throws MatchNotFoundError when match does not exist', async () => {
    await expect(
      sut.execute({ matchId: 'ghost' }),
    ).rejects.toBeInstanceOf(MatchNotFoundError)
  })

  it('returns full match detail with athlete + team + competition + playsCount', async () => {
    matchRepository.athletesById['athlete-1'] = {
      id: 'athlete-1',
      nickname: 'R10',
      profilePhoto: 'p.png',
      primaryPosition: 'FORWARD',
      birthDate: new Date('2000-01-01'),
      user: { name: 'Ronaldo', email: 'r@x.com' },
    }
    matchRepository.teamsById['team-1'] = {
      id: 'team-1',
      name: 'Barcelona',
      acronym: 'FCB',
    }
    matchRepository.competitionsById['comp-1'] = {
      id: 'comp-1',
      name: 'La Liga',
    }
    matchRepository.playsCountByMatchId['match-1'] = 7
    matchRepository.items.push(
      makeMatch({
        id: 'match-1',
        athleteId: 'athlete-1',
        myTeamId: 'team-1',
        competitionId: 'comp-1',
      }),
    )

    const match = await sut.execute({ matchId: 'match-1' })

    expect(match.id).toBe('match-1')
    expect(match.playsCount).toBe(7)
    expect(match.competition).toEqual({ id: 'comp-1', name: 'La Liga' })
    expect(match.myTeam).toEqual({
      id: 'team-1',
      name: 'Barcelona',
      acronym: 'FCB',
    })
    expect(match.athleteProfile.name).toBe('Ronaldo')
    expect(match.athleteProfile.nickname).toBe('R10')
  })
})
