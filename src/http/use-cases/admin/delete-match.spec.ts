import type { Match } from 'generated/prisma/client.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryMatchRepository } from '../../repositories/in-memory/in-memory-match-repository.js'

import { DeleteMatchAdminUseCase, MatchNotFoundError } from './delete-match.js'

let matchRepository: InMemoryMatchRepository
let sut: DeleteMatchAdminUseCase

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
    status: 'SCHEDULED',
    result: 'NOT_FINISHED',
    myTeamScore: null,
    adversaryScore: null,
    playerPosition: null,
    observations: null,
    matchDuration: null,
    approximateTime: null,
    photoUrl: null,
    videoUrl: null,
    youtubeUrl: null,
    performanceRating: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  }
}

beforeEach(() => {
  matchRepository = new InMemoryMatchRepository()
  sut = new DeleteMatchAdminUseCase(matchRepository)
})

describe('Delete Match Admin Use Case', () => {
  it('throws MatchNotFoundError when match does not exist', async () => {
    await expect(sut.execute({ matchId: 'ghost' })).rejects.toBeInstanceOf(
      MatchNotFoundError,
    )
  })

  it('removes the match from the repository', async () => {
    matchRepository.items.push(makeMatch('m-1'))
    matchRepository.items.push(makeMatch('m-2'))

    await sut.execute({ matchId: 'm-1' })

    expect(matchRepository.items).toHaveLength(1)
    expect(matchRepository.items[0]?.id).toBe('m-2')
  })
})
