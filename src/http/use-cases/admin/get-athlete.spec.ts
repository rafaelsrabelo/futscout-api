import type {
  Address,
  AthleteProfile,
  User,
} from 'generated/prisma/client.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryAthleteProfileRepository } from '../../repositories/in-memory/in-memory-athlete-profile-repository.js'
import { AthleteNotFoundError } from './errors/athlete-not-found-error.js'
import { GetAthleteAdminUseCase } from './get-athlete.js'

let athleteProfileRepository: InMemoryAthleteProfileRepository
let sut: GetAthleteAdminUseCase

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: overrides.id ?? 'user-1',
    email: overrides.email ?? 'rafa@example.com',
    name: overrides.name ?? 'Rafael Rabelo',
    password: 'hashed',
    role: overrides.role ?? 'ATHLETE',
    provider: 'CREDENTIALS',
    providerId: null,
    emailVerified: overrides.emailVerified ?? true,
    isActive: overrides.isActive ?? true,
    isProfile: true,
    stripeCustomerId: null,
    createdAt: overrides.createdAt ?? new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  }
}

function makeProfile(
  userId: string,
  overrides: Partial<AthleteProfile> = {},
): AthleteProfile {
  return {
    id: overrides.id ?? 'profile-1',
    userId,
    cpf: overrides.cpf ?? '12345678901',
    gender: 'MALE',
    nickname: overrides.nickname ?? 'Rafa',
    profilePhoto: null,
    birthDate: overrides.birthDate ?? new Date('2005-06-15'),
    instagramUrl: null,
    twitterUrl: null,
    youtubeUrl: null,
    height: 1.78,
    weight: 72,
    dominantFoot: 'RIGHT',
    primaryPosition: overrides.primaryPosition ?? 'FORWARD',
    secondaryPosition: null,
    currentClub: overrides.currentClub ?? 'Flamengo',
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
  athleteProfileRepository = new InMemoryAthleteProfileRepository()
  sut = new GetAthleteAdminUseCase(athleteProfileRepository)
})

describe('Get Athlete Admin Use Case', () => {
  it('throws AthleteNotFoundError when the athlete does not exist', async () => {
    await expect(() =>
      sut.execute({ athleteProfileId: 'missing' }),
    ).rejects.toBeInstanceOf(AthleteNotFoundError)
  })

  it('returns profile + user + subscription + counts + playsByType', async () => {
    const user = makeUser()
    const profile = makeProfile(user.id)

    athleteProfileRepository.addUser(user)
    athleteProfileRepository.items.push(profile)

    const address: Address = {
      id: 'addr-1',
      athleteId: profile.id,
      zipCode: '20000-000',
      street: 'Av. Atlântica',
      number: '100',
      complement: null,
      district: 'Copacabana',
      city: 'Rio de Janeiro',
      state: 'RJ',
      country: 'Brasil',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    athleteProfileRepository.addresses.push(address)

    athleteProfileRepository.matches.push(
      { id: 'match-1', athleteId: profile.id },
      { id: 'match-2', athleteId: profile.id },
    )
    athleteProfileRepository.plays.push(
      { id: 'p1', athleteId: null, matchId: 'match-1', playType: 'GOAL' },
      { id: 'p2', athleteId: null, matchId: 'match-1', playType: 'GOAL' },
      { id: 'p3', athleteId: null, matchId: 'match-2', playType: 'ASSIST' },
      { id: 'p4', athleteId: profile.id, matchId: null, playType: 'DRIBBLE' },
    )
    athleteProfileRepository.achievementsByAthlete[profile.id] = 3
    athleteProfileRepository.teamHistoryByAthlete[profile.id] = 2
    athleteProfileRepository.subscriptions.push({
      userId: user.id,
      view: {
        status: 'active',
        currentPeriodEnd: new Date('2026-12-31'),
        plan: {
          id: 'plan-premium',
          name: 'PREMIUM',
          price: 2990,
          currency: 'BRL',
          isUnlimited: false,
        },
      },
    })

    const result = await sut.execute({ athleteProfileId: profile.id })

    expect(result.profile.id).toBe(profile.id)
    expect(result.address?.city).toBe('Rio de Janeiro')
    expect(result.user.email).toBe('rafa@example.com')
    expect(result.user.role).toBe('ATHLETE')
    expect(result.subscription?.plan.name).toBe('PREMIUM')
    expect(result.counts).toEqual({
      matches: 2,
      plays: 4,
      achievements: 3,
      teamHistory: 2,
    })

    const playsByType = Object.fromEntries(
      result.playsByType.map((entry) => [entry.type, entry.count]),
    )
    expect(playsByType).toEqual({ GOAL: 2, ASSIST: 1, DRIBBLE: 1 })
  })

  it('returns subscription as null when the athlete has no active subscription', async () => {
    const user = makeUser({ id: 'user-2' })
    const profile = makeProfile(user.id, { id: 'profile-2' })

    athleteProfileRepository.addUser(user)
    athleteProfileRepository.items.push(profile)

    const result = await sut.execute({ athleteProfileId: profile.id })

    expect(result.subscription).toBeNull()
    expect(result.counts.matches).toBe(0)
    expect(result.playsByType).toEqual([])
  })
})
