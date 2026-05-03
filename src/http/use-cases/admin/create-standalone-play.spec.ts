import type { AthleteProfile, User } from 'generated/prisma/client.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryAthleteProfileRepository } from '../../repositories/in-memory/in-memory-athlete-profile-repository.js'
import { InMemoryPlayRepository } from '../../repositories/in-memory/in-memory-play-repository.js'

import {
  AthleteNotFoundError,
  CreateStandalonePlayAdminUseCase,
} from './create-standalone-play.js'

let playRepository: InMemoryPlayRepository
let athleteRepository: InMemoryAthleteProfileRepository
let sut: CreateStandalonePlayAdminUseCase

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

beforeEach(() => {
  playRepository = new InMemoryPlayRepository()
  athleteRepository = new InMemoryAthleteProfileRepository()
  sut = new CreateStandalonePlayAdminUseCase(playRepository, athleteRepository)

  athleteRepository.addUser(makeUser('user-1'))
  athleteRepository.items.push(makeAthlete('athlete-1', 'user-1'))
})

describe('Create Standalone Play Admin Use Case', () => {
  it('throws AthleteNotFoundError when athlete does not exist', async () => {
    await expect(
      sut.execute({ athleteProfileId: 'ghost', playType: 'GOAL' }),
    ).rejects.toBeInstanceOf(AthleteNotFoundError)
  })

  it('creates a standalone play (matchId null) for the athlete', async () => {
    const play = await sut.execute({
      athleteProfileId: 'athlete-1',
      playType: 'DRIBBLE',
      videoUrl: 'https://r2/foo.mp4',
      rating: 5,
      observations: 'Drible em velocidade',
      classifications: ['TECHNICAL', 'PHYSICAL'],
    })

    expect(play.matchId).toBeNull()
    expect(play.athleteId).toBe('athlete-1')
    expect(play.playType).toBe('DRIBBLE')
    expect(play.videoUrl).toBe('https://r2/foo.mp4')
    expect(play.rating).toBe(5)
    expect(play.classifications).toHaveLength(2)
    expect(playRepository.items).toHaveLength(1)
  })

  it('creates without optional fields and with empty classifications', async () => {
    const play = await sut.execute({
      athleteProfileId: 'athlete-1',
      playType: 'GOAL',
    })

    expect(play.matchId).toBeNull()
    expect(play.videoUrl).toBeNull()
    expect(play.classifications).toHaveLength(0)
  })
})
