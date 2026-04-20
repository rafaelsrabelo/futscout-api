import type { Match } from 'generated/prisma/client.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryMatchRepository } from '../../repositories/in-memory/in-memory-match-repository.js'
import { InMemoryPlayRepository } from '../../repositories/in-memory/in-memory-play-repository.js'
import {
  AddPlayToMatchUseCase,
  MatchNotFoundError,
} from '../add-play-to-match.js'

let playRepository: InMemoryPlayRepository
let matchRepository: InMemoryMatchRepository
let sut: AddPlayToMatchUseCase

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: overrides.id ?? 'match-1',
    athleteId: overrides.athleteId ?? 'athlete-target',
    myTeamId: overrides.myTeamId ?? 'team-1',
    adversaryTeam: overrides.adversaryTeam ?? 'Rival FC',
    date: overrides.date ?? new Date('2025-01-01'),
    modality: overrides.modality ?? 'FUT_11',
    category: overrides.category ?? 'PROFESSIONAL',
    location: overrides.location ?? 'Estádio X',
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
    createdAt: overrides.createdAt ?? new Date('2025-01-01'),
    updatedAt: overrides.updatedAt ?? new Date('2025-01-01'),
  }
}

beforeEach(() => {
  playRepository = new InMemoryPlayRepository()
  matchRepository = new InMemoryMatchRepository()
  sut = new AddPlayToMatchUseCase(playRepository, matchRepository)
})

describe('Add Play To Match — admin flow', () => {
  it('creates a play on a match owned by any athlete when athleteProfileId matches match.athleteId', async () => {
    matchRepository.items.push(
      makeMatch({ id: 'match-a', athleteId: 'athlete-target' }),
    )

    const play = await sut.execute({
      matchId: 'match-a',
      athleteProfileId: 'athlete-target',
      playType: 'GOAL',
      videoUrl: 'https://cdn.example.com/video.mp4',
    })

    expect(play.matchId).toBe('match-a')
    expect(play.athleteId).toBe('athlete-target')
    expect(play.playType).toBe('GOAL')
    expect(play.videoUrl).toBe('https://cdn.example.com/video.mp4')
    expect(playRepository.items).toHaveLength(1)
  })

  it('throws MatchNotFoundError when the match does not exist', async () => {
    await expect(
      sut.execute({
        matchId: 'missing-match',
        athleteProfileId: 'athlete-target',
        playType: 'ASSIST',
      }),
    ).rejects.toBeInstanceOf(MatchNotFoundError)

    expect(playRepository.items).toHaveLength(0)
  })

  it('persists classifications alongside the play', async () => {
    matchRepository.items.push(
      makeMatch({ id: 'match-b', athleteId: 'athlete-target' }),
    )

    const play = await sut.execute({
      matchId: 'match-b',
      athleteProfileId: 'athlete-target',
      playType: 'DRIBBLE',
      classifications: ['TECHNICAL', 'TACTICAL'],
    })

    expect(play.classifications).toHaveLength(2)
    expect(play.classifications.map((c) => c.classification).sort()).toEqual([
      'TACTICAL',
      'TECHNICAL',
    ])
    expect(play.classifications.every((c) => c.playId === play.id)).toBe(true)
  })
})
