import type { Match } from 'generated/prisma/client.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryMatchRepository } from '../../repositories/in-memory/in-memory-match-repository.js'
import { InMemoryPlayRepository } from '../../repositories/in-memory/in-memory-play-repository.js'
import {
  ListMatchPlaysAdminUseCase,
  MatchNotFoundError,
} from './list-match-plays.js'

let playRepository: InMemoryPlayRepository
let matchRepository: InMemoryMatchRepository
let sut: ListMatchPlaysAdminUseCase

function makeMatch(id: string): Match {
  return {
    id,
    athleteId: 'athlete-1',
    myTeamId: 'team-1',
    adversaryTeam: 'Rival',
    date: new Date('2025-01-01'),
    modality: 'FUT_11',
    category: 'PROFESSIONAL',
    location: 'Estádio',
    streamUrl: null,
    competitionId: null,
    status: 'FINISHED',
    result: 'WIN',
    myTeamScore: 1,
    adversaryScore: 0,
    playerPosition: 'STARTER',
    observations: null,
    matchDuration: 90,
    approximateTime: 90,
    photoUrl: null,
    videoUrl: null,
    youtubeUrl: null,
    performanceRating: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  }
}

beforeEach(() => {
  playRepository = new InMemoryPlayRepository()
  matchRepository = new InMemoryMatchRepository()
  sut = new ListMatchPlaysAdminUseCase(playRepository, matchRepository)
})

describe('List Match Plays Admin Use Case', () => {
  it('throws MatchNotFoundError when match does not exist', async () => {
    await expect(sut.execute({ matchId: 'ghost' })).rejects.toBeInstanceOf(
      MatchNotFoundError,
    )
  })

  it('returns empty list for a match with no plays', async () => {
    matchRepository.items.push(makeMatch('m-1'))
    const result = await sut.execute({ matchId: 'm-1' })
    expect(result.items).toEqual([])
  })

  it('returns all plays linked to the match', async () => {
    matchRepository.items.push(makeMatch('m-1'))
    await playRepository.createWithClassifications({
      matchId: 'm-1',
      athleteId: 'athlete-1',
      playType: 'GOAL',
      classifications: ['TECHNICAL'],
    })
    await playRepository.createWithClassifications({
      matchId: 'm-2',
      athleteId: 'athlete-1',
      playType: 'ASSIST',
    })

    const result = await sut.execute({ matchId: 'm-1' })
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.playType).toBe('GOAL')
  })
})
