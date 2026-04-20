import type { AthleteProfile, User } from 'generated/prisma/client.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryAthleteProfileRepository } from '../../repositories/in-memory/in-memory-athlete-profile-repository.js'
import { InMemoryPlayRepository } from '../../repositories/in-memory/in-memory-play-repository.js'
import { AthleteNotFoundError } from './list-athlete-matches.js'
import { ListAthletePlaysAdminUseCase } from './list-athlete-plays.js'

let playRepository: InMemoryPlayRepository
let athleteProfileRepository: InMemoryAthleteProfileRepository
let sut: ListAthletePlaysAdminUseCase

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

beforeEach(async () => {
  playRepository = new InMemoryPlayRepository()
  athleteProfileRepository = new InMemoryAthleteProfileRepository()
  sut = new ListAthletePlaysAdminUseCase(
    playRepository,
    athleteProfileRepository,
  )

  athleteProfileRepository.addUser(makeUser('user-athlete-1'))
  athleteProfileRepository.items.push(makeAthlete('athlete-1'))
})

describe('List Athlete Plays Admin Use Case', () => {
  it('throws when athlete does not exist', async () => {
    await expect(
      sut.execute({ athleteProfileId: 'ghost' }),
    ).rejects.toBeInstanceOf(AthleteNotFoundError)
  })

  it('returns empty list when athlete has no plays', async () => {
    const result = await sut.execute({ athleteProfileId: 'athlete-1' })

    expect(result.total).toBe(0)
    expect(result.items).toEqual([])
    expect(result.hasMore).toBe(false)
  })

  it('filters by hasVideo true/false', async () => {
    playRepository.matchMeta['m-1'] = {
      id: 'm-1',
      date: new Date('2025-01-01'),
      adversaryTeam: 'Rival',
      athleteId: 'athlete-1',
    }

    await playRepository.createWithClassifications({
      matchId: 'm-1',
      athleteId: 'athlete-1',
      playType: 'GOAL',
      videoUrl: 'https://cdn/v.mp4',
    })
    await playRepository.createWithClassifications({
      matchId: 'm-1',
      athleteId: 'athlete-1',
      playType: 'ASSIST',
      videoUrl: null,
    })

    const withVideo = await sut.execute({
      athleteProfileId: 'athlete-1',
      hasVideo: true,
    })
    expect(withVideo.total).toBe(1)
    expect(withVideo.items[0]?.playType).toBe('GOAL')

    const withoutVideo = await sut.execute({
      athleteProfileId: 'athlete-1',
      hasVideo: false,
    })
    expect(withoutVideo.total).toBe(1)
    expect(withoutVideo.items[0]?.playType).toBe('ASSIST')
  })

  it('filters by playType and exposes match context', async () => {
    playRepository.matchMeta['m-1'] = {
      id: 'm-1',
      date: new Date('2025-02-10'),
      adversaryTeam: 'Palmeiras',
      athleteId: 'athlete-1',
    }

    await playRepository.createWithClassifications({
      matchId: 'm-1',
      athleteId: 'athlete-1',
      playType: 'GOAL',
    })
    await playRepository.createWithClassifications({
      matchId: 'm-1',
      athleteId: 'athlete-1',
      playType: 'DRIBBLE',
    })

    const goals = await sut.execute({
      athleteProfileId: 'athlete-1',
      playType: 'GOAL',
    })

    expect(goals.items).toHaveLength(1)
    expect(goals.items[0]?.match).toEqual({
      id: 'm-1',
      date: new Date('2025-02-10'),
      adversaryTeam: 'Palmeiras',
    })
  })

  it('paginates correctly', async () => {
    for (let i = 0; i < 25; i++) {
      await playRepository.createWithClassifications({
        matchId: 'm-1',
        athleteId: 'athlete-1',
        playType: 'PASS',
      })
    }

    const page1 = await sut.execute({
      athleteProfileId: 'athlete-1',
      page: 1,
      pageSize: 10,
    })
    expect(page1.total).toBe(25)
    expect(page1.items).toHaveLength(10)
    expect(page1.hasMore).toBe(true)

    const page3 = await sut.execute({
      athleteProfileId: 'athlete-1',
      page: 3,
      pageSize: 10,
    })
    expect(page3.items).toHaveLength(5)
    expect(page3.hasMore).toBe(false)
  })
})
