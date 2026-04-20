import type { Match } from 'generated/prisma/client.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryMatchRepository } from '../../repositories/in-memory/in-memory-match-repository.js'
import { ListMatchesAdminUseCase } from './list-matches.js'

let matchRepository: InMemoryMatchRepository
let sut: ListMatchesAdminUseCase

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
    streamUrl: overrides.streamUrl ?? null,
    competitionId: overrides.competitionId ?? null,
    status: overrides.status ?? 'FINISHED',
    result: overrides.result ?? 'WIN',
    myTeamScore: overrides.myTeamScore ?? 2,
    adversaryScore: overrides.adversaryScore ?? 1,
    playerPosition: overrides.playerPosition ?? 'STARTER',
    observations: overrides.observations ?? null,
    matchDuration: overrides.matchDuration ?? 90,
    approximateTime: overrides.approximateTime ?? 90,
    photoUrl: overrides.photoUrl ?? null,
    videoUrl: overrides.videoUrl ?? null,
    youtubeUrl: overrides.youtubeUrl ?? null,
    performanceRating: overrides.performanceRating ?? null,
    createdAt: overrides.createdAt ?? new Date('2025-05-01'),
    updatedAt: overrides.updatedAt ?? new Date('2025-05-01'),
  }
}

beforeEach(() => {
  matchRepository = new InMemoryMatchRepository()
  sut = new ListMatchesAdminUseCase(matchRepository)

  matchRepository.athletesById['athlete-1'] = {
    id: 'athlete-1',
    nickname: 'Ronaldinho',
    profilePhoto: 'pic-1',
    primaryPosition: 'FORWARD',
    birthDate: new Date('2000-01-01'),
    user: { name: 'Ronaldo Assis', email: 'r@x.com' },
  }
  matchRepository.athletesById['athlete-2'] = {
    id: 'athlete-2',
    nickname: 'Goleiro',
    profilePhoto: null,
    primaryPosition: 'GOALKEEPER',
    birthDate: new Date('1990-01-01'),
    user: { name: 'Dida', email: 'd@x.com' },
  }
})

describe('List Matches Admin Use Case (global search)', () => {
  it('returns empty result set when no matches exist', async () => {
    const result = await sut.execute({})

    expect(result.total).toBe(0)
    expect(result.items).toEqual([])
    expect(result.hasMore).toBe(false)
  })

  it('filters by q matching athlete name, nickname or email', async () => {
    matchRepository.items.push(
      makeMatch({ id: 'm1', athleteId: 'athlete-1' }),
      makeMatch({ id: 'm2', athleteId: 'athlete-2' }),
    )

    const byNick = await sut.execute({ q: 'ronal' })
    expect(byNick.items.map((i) => i.id)).toEqual(['m1'])

    const byEmail = await sut.execute({ q: 'd@x' })
    expect(byEmail.items.map((i) => i.id)).toEqual(['m2'])
  })

  it('filters by primaryPosition', async () => {
    matchRepository.items.push(
      makeMatch({ id: 'm1', athleteId: 'athlete-1' }),
      makeMatch({ id: 'm2', athleteId: 'athlete-2' }),
    )

    const gks = await sut.execute({ primaryPosition: 'GOALKEEPER' })
    expect(gks.items.map((i) => i.id)).toEqual(['m2'])
  })

  it('returns athleteProfile context on each item', async () => {
    matchRepository.items.push(makeMatch({ id: 'm1', athleteId: 'athlete-1' }))

    const result = await sut.execute({})

    expect(result.items[0]?.athleteProfile).toEqual({
      id: 'athlete-1',
      name: 'Ronaldo Assis',
      nickname: 'Ronaldinho',
      profilePhoto: 'pic-1',
      primaryPosition: 'FORWARD',
    })
  })

  it('paginates and orders by date desc', async () => {
    for (let i = 0; i < 25; i++) {
      matchRepository.items.push(
        makeMatch({
          id: `m-${i}`,
          athleteId: 'athlete-1',
          date: new Date(2025, 0, i + 1),
        }),
      )
    }

    const page1 = await sut.execute({ page: 1, pageSize: 10 })
    expect(page1.total).toBe(25)
    expect(page1.items).toHaveLength(10)
    expect(page1.items[0]?.id).toBe('m-24')
    expect(page1.hasMore).toBe(true)
  })
})
