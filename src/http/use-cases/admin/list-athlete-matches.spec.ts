import type {
  AthleteProfile,
  Match,
  User,
} from 'generated/prisma/client.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryAthleteProfileRepository } from '../../repositories/in-memory/in-memory-athlete-profile-repository.js'
import { InMemoryMatchRepository } from '../../repositories/in-memory/in-memory-match-repository.js'
import {
  AthleteNotFoundError,
  ListAthleteMatchesAdminUseCase,
} from './list-athlete-matches.js'

let matchRepository: InMemoryMatchRepository
let athleteProfileRepository: InMemoryAthleteProfileRepository
let sut: ListAthleteMatchesAdminUseCase

function makeAthlete(overrides: Partial<AthleteProfile> = {}): AthleteProfile {
  return {
    id: overrides.id ?? 'athlete-1',
    userId: overrides.userId ?? 'user-1',
    cpf: overrides.cpf ?? '00000000000',
    gender: overrides.gender ?? 'MALE',
    nickname: overrides.nickname ?? null,
    profilePhoto: overrides.profilePhoto ?? null,
    birthDate: overrides.birthDate ?? new Date('2005-06-15'),
    instagramUrl: overrides.instagramUrl ?? null,
    twitterUrl: overrides.twitterUrl ?? null,
    youtubeUrl: overrides.youtubeUrl ?? null,
    height: overrides.height ?? 1.8,
    weight: overrides.weight ?? 75,
    dominantFoot: overrides.dominantFoot ?? 'RIGHT',
    primaryPosition: overrides.primaryPosition ?? 'MIDFIELDER',
    secondaryPosition: overrides.secondaryPosition ?? null,
    currentClub: overrides.currentClub ?? null,
    biography: overrides.biography ?? null,
    hasManager: overrides.hasManager ?? false,
    managerName: overrides.managerName ?? null,
    managerCompany: overrides.managerCompany ?? null,
    managerContact: overrides.managerContact ?? null,
    hasNutritionist: overrides.hasNutritionist ?? false,
    hasPsychologist: overrides.hasPsychologist ?? false,
    hasPersonalTrainer: overrides.hasPersonalTrainer ?? false,
    createdAt: overrides.createdAt ?? new Date('2025-01-01'),
    updatedAt: overrides.updatedAt ?? new Date('2025-01-01'),
  }
}

function makeUser(id: string): User {
  return {
    id,
    email: `${id}@x.com`,
    name: 'User',
    password: 'hashed',
    role: 'ATHLETE',
    provider: 'CREDENTIALS',
    providerId: null,
    emailVerified: true,
    isActive: true,
    isProfile: true,
    stripeCustomerId: null,
    lastLoginAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  }
}

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: overrides.id ?? 'match-1',
    athleteId: overrides.athleteId ?? 'athlete-1',
    myTeamId: overrides.myTeamId ?? 'team-1',
    adversaryTeam: overrides.adversaryTeam ?? 'Rival FC',
    date: overrides.date ?? new Date('2025-05-01'),
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
    createdAt: overrides.createdAt ?? new Date('2025-05-01'),
    updatedAt: overrides.updatedAt ?? new Date('2025-05-01'),
  }
}

beforeEach(() => {
  matchRepository = new InMemoryMatchRepository()
  athleteProfileRepository = new InMemoryAthleteProfileRepository()
  sut = new ListAthleteMatchesAdminUseCase(
    matchRepository,
    athleteProfileRepository,
  )

  athleteProfileRepository.addUser(makeUser('user-1'))
  athleteProfileRepository.items.push(
    makeAthlete({ id: 'athlete-1', userId: 'user-1' }),
  )
})

describe('List Athlete Matches Admin Use Case', () => {
  it('throws AthleteNotFoundError when the athlete does not exist', async () => {
    await expect(
      sut.execute({ athleteProfileId: 'missing' }),
    ).rejects.toBeInstanceOf(AthleteNotFoundError)
  })

  it('returns empty list when athlete has no matches', async () => {
    const result = await sut.execute({ athleteProfileId: 'athlete-1' })

    expect(result.total).toBe(0)
    expect(result.items).toEqual([])
    expect(result.hasMore).toBe(false)
  })

  it('returns matches only for the requested athlete ordered by date desc', async () => {
    matchRepository.items.push(
      makeMatch({ id: 'm1', athleteId: 'athlete-1', date: new Date('2025-01-01') }),
      makeMatch({ id: 'm2', athleteId: 'athlete-1', date: new Date('2025-03-01') }),
      makeMatch({ id: 'm3', athleteId: 'athlete-2', date: new Date('2025-06-01') }),
    )

    const result = await sut.execute({ athleteProfileId: 'athlete-1' })

    expect(result.total).toBe(2)
    expect(result.items.map((i) => i.id)).toEqual(['m2', 'm1'])
  })

  it('filters by status and result', async () => {
    matchRepository.items.push(
      makeMatch({ id: 'm1', athleteId: 'athlete-1', status: 'FINISHED', result: 'WIN' }),
      makeMatch({ id: 'm2', athleteId: 'athlete-1', status: 'SCHEDULED', result: 'NOT_FINISHED' }),
      makeMatch({ id: 'm3', athleteId: 'athlete-1', status: 'FINISHED', result: 'LOSS' }),
    )

    const wins = await sut.execute({
      athleteProfileId: 'athlete-1',
      status: 'FINISHED',
      result: 'WIN',
    })
    expect(wins.items.map((i) => i.id)).toEqual(['m1'])
  })

  it('filters by date range (from/to)', async () => {
    matchRepository.items.push(
      makeMatch({ id: 'm1', athleteId: 'athlete-1', date: new Date('2025-01-15') }),
      makeMatch({ id: 'm2', athleteId: 'athlete-1', date: new Date('2025-02-15') }),
      makeMatch({ id: 'm3', athleteId: 'athlete-1', date: new Date('2025-03-15') }),
    )

    const result = await sut.execute({
      athleteProfileId: 'athlete-1',
      from: new Date('2025-02-01'),
      to: new Date('2025-03-01'),
    })

    expect(result.items.map((i) => i.id)).toEqual(['m2'])
  })

  it('paginates and exposes playsCount + competition when set', async () => {
    matchRepository.competitionsById['comp-1'] = {
      id: 'comp-1',
      name: 'Campeonato X',
    }
    for (let i = 0; i < 25; i++) {
      matchRepository.items.push(
        makeMatch({
          id: `m-${i}`,
          athleteId: 'athlete-1',
          competitionId: i % 2 === 0 ? 'comp-1' : null,
          date: new Date(2025, 0, i + 1),
        }),
      )
      matchRepository.playsCountByMatchId[`m-${i}`] = i
    }

    const firstPage = await sut.execute({
      athleteProfileId: 'athlete-1',
      page: 1,
      pageSize: 10,
    })

    expect(firstPage.total).toBe(25)
    expect(firstPage.items).toHaveLength(10)
    expect(firstPage.hasMore).toBe(true)
    expect(firstPage.items[0]?.playsCount).toBe(24)
    expect(firstPage.items[0]?.competition).toEqual({
      id: 'comp-1',
      name: 'Campeonato X',
    })
  })
})
