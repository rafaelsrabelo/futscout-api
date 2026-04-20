import type { Match } from 'generated/prisma/client.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryMatchRepository } from '../../repositories/in-memory/in-memory-match-repository.js'
import {
  MatchNotFoundError,
  UpdateMatchResultAdminUseCase,
} from './update-match-result.js'

let matchRepository: InMemoryMatchRepository
let sut: UpdateMatchResultAdminUseCase

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: overrides.id ?? 'match-1',
    athleteId: 'athlete-1',
    myTeamId: 'team-1',
    adversaryTeam: 'Rival',
    date: new Date('2025-01-01'),
    modality: 'FUT_11',
    category: 'PROFESSIONAL',
    location: 'Estádio',
    streamUrl: null,
    competitionId: null,
    status: overrides.status ?? 'SCHEDULED',
    result: overrides.result ?? 'NOT_FINISHED',
    myTeamScore: overrides.myTeamScore ?? null,
    adversaryScore: overrides.adversaryScore ?? null,
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
  sut = new UpdateMatchResultAdminUseCase(matchRepository)
})

describe('Update Match Result Admin Use Case', () => {
  it('throws when match does not exist', async () => {
    await expect(
      sut.execute({ matchId: 'ghost', myTeamScore: 2 }),
    ).rejects.toBeInstanceOf(MatchNotFoundError)
  })

  it('derives WIN/LOSS/DRAW from scores when result not provided', async () => {
    matchRepository.items.push(makeMatch({ id: 'm-win' }))
    matchRepository.items.push(makeMatch({ id: 'm-loss' }))
    matchRepository.items.push(makeMatch({ id: 'm-draw' }))

    const win = await sut.execute({
      matchId: 'm-win',
      myTeamScore: 3,
      adversaryScore: 1,
    })
    expect(win.result).toBe('WIN')

    const loss = await sut.execute({
      matchId: 'm-loss',
      myTeamScore: 0,
      adversaryScore: 2,
    })
    expect(loss.result).toBe('LOSS')

    const draw = await sut.execute({
      matchId: 'm-draw',
      myTeamScore: 1,
      adversaryScore: 1,
    })
    expect(draw.result).toBe('DRAW')
  })

  it('honours explicit result when provided', async () => {
    matchRepository.items.push(makeMatch({ id: 'm-1' }))

    const updated = await sut.execute({
      matchId: 'm-1',
      myTeamScore: 3,
      adversaryScore: 1,
      result: 'NOT_FINISHED',
    })

    expect(updated.result).toBe('NOT_FINISHED')
  })

  it('can force status transition (SCHEDULED -> FINISHED)', async () => {
    matchRepository.items.push(
      makeMatch({ id: 'm-1', status: 'SCHEDULED' }),
    )

    const updated = await sut.execute({
      matchId: 'm-1',
      status: 'FINISHED',
      myTeamScore: 1,
      adversaryScore: 0,
    })

    expect(updated.status).toBe('FINISHED')
    expect(updated.result).toBe('WIN')
    expect(updated.myTeamScore).toBe(1)
  })
})
