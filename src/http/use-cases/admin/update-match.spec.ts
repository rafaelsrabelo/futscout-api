import type { AthleteProfile, Match, User } from 'generated/prisma/client.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryAthleteProfileRepository } from '../../repositories/in-memory/in-memory-athlete-profile-repository.js'
import { InMemoryMatchRepository } from '../../repositories/in-memory/in-memory-match-repository.js'

import {
  AthleteNotFoundError,
  MatchNotFoundError,
  UpdateMatchAdminUseCase,
} from './update-match.js'

let matchRepository: InMemoryMatchRepository
let athleteRepository: InMemoryAthleteProfileRepository
let sut: UpdateMatchAdminUseCase

function makeUser(id: string): User {
  return {
    id,
    email: `${id}@x.com`,
    cpf: null,
    name: `Nome ${id}`,
    password: 'hashed',
    role: 'ATHLETE',
    provider: 'CREDENTIALS',
    providerId: null,
    emailVerified: true,
    isActive: true,
    isProfile: true,
    isImported: false,
    stripeCustomerId: null,
    lastLoginAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  }
}

function makeAthlete(id: string, userId: string): AthleteProfile {
  return {
    id,
    userId,
    gender: 'MALE',
    nickname: null,
    profilePhoto: null,
    birthDate: new Date('2005-06-15'),
    instagramUrl: null,
    twitterUrl: null,
    youtubeUrl: null,
    height: 1.8,
    weight: 75,
    dominantFoot: 'RIGHT',
    primaryPosition: 'MIDFIELDER',
    secondaryPosition: null,
    currentClub: null,
    biography: null,
    hasManager: false,
    managerName: null,
    managerCompany: null,
    managerContact: null,
    hasNutritionist: false,
    hasPsychologist: false,
    hasPersonalTrainer: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  } as AthleteProfile
}

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: overrides.id ?? 'match-1',
    athleteId: overrides.athleteId ?? 'athlete-1',
    myTeamId: overrides.myTeamId ?? 'team-1',
    adversaryTeam: overrides.adversaryTeam ?? 'Rival',
    date: overrides.date ?? new Date('2025-01-01'),
    modality: overrides.modality ?? 'FUT_11',
    category: overrides.category ?? 'PROFESSIONAL',
    location: overrides.location ?? 'Estádio',
    streamUrl: overrides.streamUrl ?? null,
    competitionId: overrides.competitionId ?? null,
    status: overrides.status ?? 'SCHEDULED',
    result: overrides.result ?? 'NOT_FINISHED',
    myTeamScore: overrides.myTeamScore ?? null,
    adversaryScore: overrides.adversaryScore ?? null,
    playerPosition: overrides.playerPosition ?? null,
    observations: overrides.observations ?? null,
    matchDuration: overrides.matchDuration ?? null,
    approximateTime: overrides.approximateTime ?? null,
    photoUrl: overrides.photoUrl ?? null,
    videoUrl: overrides.videoUrl ?? null,
    youtubeUrl: overrides.youtubeUrl ?? null,
    performanceRating: overrides.performanceRating ?? null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  }
}

beforeEach(() => {
  matchRepository = new InMemoryMatchRepository()
  athleteRepository = new InMemoryAthleteProfileRepository()
  sut = new UpdateMatchAdminUseCase(matchRepository, athleteRepository)

  athleteRepository.addUser(makeUser('user-1'))
  athleteRepository.items.push(makeAthlete('athlete-1', 'user-1'))
  athleteRepository.addUser(makeUser('user-2'))
  athleteRepository.items.push(makeAthlete('athlete-2', 'user-2'))

  matchRepository.items.push(makeMatch({ id: 'match-1' }))
})

describe('Update Match Admin Use Case', () => {
  it('throws MatchNotFoundError when match does not exist', async () => {
    await expect(
      sut.execute({ matchId: 'ghost', adversaryTeam: 'X' }),
    ).rejects.toBeInstanceOf(MatchNotFoundError)
  })

  it('throws AthleteNotFoundError when reassigning to a non-existent athlete', async () => {
    await expect(
      sut.execute({ matchId: 'match-1', athleteProfileId: 'ghost' }),
    ).rejects.toBeInstanceOf(AthleteNotFoundError)
  })

  it('updates basic match fields', async () => {
    const updated = await sut.execute({
      matchId: 'match-1',
      adversaryTeam: 'Rival FC',
      location: 'Arena',
      modality: 'FUTSAL',
      category: 'U17',
      date: new Date('2026-04-10'),
    })

    expect(updated.adversaryTeam).toBe('Rival FC')
    expect(updated.location).toBe('Arena')
    expect(updated.modality).toBe('FUTSAL')
    expect(updated.category).toBe('U17')
    expect(updated.date).toEqual(new Date('2026-04-10'))
  })

  it('reassigns athlete via athleteProfileId', async () => {
    const updated = await sut.execute({
      matchId: 'match-1',
      athleteProfileId: 'athlete-2',
    })

    expect(updated.athleteId).toBe('athlete-2')
  })

  it('connects and disconnects competition via competitionId', async () => {
    const connected = await sut.execute({
      matchId: 'match-1',
      competitionId: 'comp-1',
    })
    expect(connected.competitionId).toBe('comp-1')

    const disconnected = await sut.execute({
      matchId: 'match-1',
      competitionId: null,
    })
    expect(disconnected.competitionId).toBeNull()
  })

  it('derives result from scores when result not provided', async () => {
    const updated = await sut.execute({
      matchId: 'match-1',
      myTeamScore: 3,
      adversaryScore: 1,
    })
    expect(updated.result).toBe('WIN')
    expect(updated.myTeamScore).toBe(3)
  })

  it('honours explicit result over derivation', async () => {
    const updated = await sut.execute({
      matchId: 'match-1',
      myTeamScore: 3,
      adversaryScore: 1,
      result: 'NOT_FINISHED',
    })
    expect(updated.result).toBe('NOT_FINISHED')
  })

  it('updates rating, observations and media URLs', async () => {
    const updated = await sut.execute({
      matchId: 'match-1',
      performanceRating: 5,
      observations: 'Boa partida',
      youtubeUrl: 'https://youtu.be/abc',
      photoUrl: 'https://r2/foo.jpg',
    })

    expect(updated.performanceRating).toBe(5)
    expect(updated.observations).toBe('Boa partida')
    expect(updated.youtubeUrl).toBe('https://youtu.be/abc')
    expect(updated.photoUrl).toBe('https://r2/foo.jpg')
  })
})
