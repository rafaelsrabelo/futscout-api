import type { AthleteProfile, Match, User } from 'generated/prisma/client.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryAthleteProfileRepository } from '../../repositories/in-memory/in-memory-athlete-profile-repository.js'
import { InMemoryMatchRepository } from '../../repositories/in-memory/in-memory-match-repository.js'
import {
  AthleteNotFoundError,
  LinkMatchAthleteAdminUseCase,
  MatchNotFoundError,
} from './link-match-athlete.js'

let matchRepository: InMemoryMatchRepository
let athleteProfileRepository: InMemoryAthleteProfileRepository
let sut: LinkMatchAthleteAdminUseCase

function makeAthlete(id: string): AthleteProfile {
  return {
    id,
    userId: `user-${id}`,
    cpf: '00000000000',
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
  athleteProfileRepository = new InMemoryAthleteProfileRepository()
  sut = new LinkMatchAthleteAdminUseCase(
    matchRepository,
    athleteProfileRepository,
  )

  athleteProfileRepository.addUser(makeUser('user-athlete-1'))
  athleteProfileRepository.addUser(makeUser('user-athlete-2'))
  athleteProfileRepository.items.push(makeAthlete('athlete-1'))
  athleteProfileRepository.items.push(makeAthlete('athlete-2'))
})

describe('Link Match Athlete Admin Use Case', () => {
  it('throws MatchNotFoundError when match does not exist', async () => {
    await expect(
      sut.execute({ matchId: 'ghost', athleteProfileId: 'athlete-1' }),
    ).rejects.toBeInstanceOf(MatchNotFoundError)
  })

  it('throws AthleteNotFoundError when target athlete does not exist', async () => {
    matchRepository.items.push(makeMatch({ id: 'm-1' }))
    await expect(
      sut.execute({ matchId: 'm-1', athleteProfileId: 'ghost' }),
    ).rejects.toBeInstanceOf(AthleteNotFoundError)
  })

  it('reassigns the match to a different athlete', async () => {
    matchRepository.items.push(
      makeMatch({ id: 'm-1', athleteId: 'athlete-1' }),
    )

    const updated = await sut.execute({
      matchId: 'm-1',
      athleteProfileId: 'athlete-2',
    })

    expect(updated.athleteId).toBe('athlete-2')
    expect(matchRepository.items[0]?.athleteId).toBe('athlete-2')
  })
})
