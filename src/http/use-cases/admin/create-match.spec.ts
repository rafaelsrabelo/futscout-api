import type { AthleteProfile, User } from 'generated/prisma/client.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryAthleteProfileRepository } from '../../repositories/in-memory/in-memory-athlete-profile-repository.js'
import { InMemoryMatchRepository } from '../../repositories/in-memory/in-memory-match-repository.js'
import {
  AthleteProfileNotFoundError,
  CreateMatchUseCase,
} from '../create-match.js'

let matchRepository: InMemoryMatchRepository
let athleteProfileRepository: InMemoryAthleteProfileRepository
let sut: CreateMatchUseCase

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

function makeAthlete(id: string, userId: string): AthleteProfile {
  return {
    id,
    userId,
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

beforeEach(() => {
  matchRepository = new InMemoryMatchRepository()
  athleteProfileRepository = new InMemoryAthleteProfileRepository()
  sut = new CreateMatchUseCase(matchRepository, athleteProfileRepository)

  athleteProfileRepository.addUser(makeUser('user-1'))
  athleteProfileRepository.items.push(makeAthlete('athlete-1', 'user-1'))
})

describe('Create Match Use Case — admin flow', () => {
  it('throws AthleteProfileNotFoundError when athleteProfileId does not exist', async () => {
    await expect(
      sut.execute({
        athleteProfileId: 'ghost',
        myTeamId: 'team-1',
        adversaryTeam: 'Rival',
        date: new Date('2025-05-01'),
        modality: 'FUT_11',
        category: 'PROFESSIONAL',
        location: 'Estádio',
      }),
    ).rejects.toBeInstanceOf(AthleteProfileNotFoundError)
  })

  it('creates a match for a different athlete than the JWT subject', async () => {
    athleteProfileRepository.addUser(makeUser('user-2'))
    athleteProfileRepository.items.push(makeAthlete('athlete-2', 'user-2'))

    const match = await sut.execute({
      athleteProfileId: 'athlete-2',
      myTeamId: 'team-7',
      adversaryTeam: 'Rival FC',
      date: new Date('2025-05-01'),
      modality: 'FUT_11',
      category: 'PROFESSIONAL',
      location: 'Estádio',
      myTeamScore: 3,
      adversaryScore: 1,
    })

    expect(match.athleteId).toBe('athlete-2')
    expect(match.result).toBe('WIN')
    expect(matchRepository.items).toHaveLength(1)
  })

  it('derives DRAW when scores are equal', async () => {
    const match = await sut.execute({
      athleteProfileId: 'athlete-1',
      myTeamId: 'team-1',
      adversaryTeam: 'Rival',
      date: new Date('2025-05-01'),
      modality: 'FUT_11',
      category: 'PROFESSIONAL',
      location: 'Estádio',
      myTeamScore: 2,
      adversaryScore: 2,
    })

    expect(match.result).toBe('DRAW')
  })
})
