import type {
  Achievement,
  AthleteProfile,
  User,
} from 'generated/prisma/client.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryAchievementRepository } from '../../repositories/in-memory/in-memory-achievement-repository.js'
import { InMemoryAthleteProfileRepository } from '../../repositories/in-memory/in-memory-athlete-profile-repository.js'
import { AthleteNotFoundError } from './list-athlete-matches.js'
import { ListAthleteAchievementsAdminUseCase } from './list-athlete-achievements.js'

let achievementRepository: InMemoryAchievementRepository
let athleteProfileRepository: InMemoryAthleteProfileRepository
let sut: ListAthleteAchievementsAdminUseCase

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
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  }
}

function makeAchievement(
  id: string,
  athleteId: string,
  overrides: Partial<Achievement> = {},
): Achievement {
  return {
    id,
    athleteId,
    name: overrides.name ?? 'Campeão',
    category: overrides.category ?? 'U20',
    year: overrides.year ?? 2024,
    type: overrides.type ?? 'COLLECTIVE',
    createdAt: overrides.createdAt ?? new Date('2025-01-01'),
    updatedAt: overrides.updatedAt ?? new Date('2025-01-01'),
  }
}

beforeEach(() => {
  achievementRepository = new InMemoryAchievementRepository()
  athleteProfileRepository = new InMemoryAthleteProfileRepository()
  sut = new ListAthleteAchievementsAdminUseCase(
    achievementRepository,
    athleteProfileRepository,
  )

  athleteProfileRepository.addUser(makeUser('user-athlete-1'))
  athleteProfileRepository.items.push(makeAthlete('athlete-1'))
})

describe('List Athlete Achievements Admin Use Case', () => {
  it('throws when athlete does not exist', async () => {
    await expect(
      sut.execute({ athleteProfileId: 'ghost' }),
    ).rejects.toBeInstanceOf(AthleteNotFoundError)
  })

  it('returns empty list when athlete has no achievements', async () => {
    const result = await sut.execute({ athleteProfileId: 'athlete-1' })

    expect(result.total).toBe(0)
    expect(result.items).toEqual([])
  })

  it('orders by year desc and filters by type + year', async () => {
    achievementRepository.items.push(
      makeAchievement('a1', 'athlete-1', { year: 2022, type: 'COLLECTIVE' }),
      makeAchievement('a2', 'athlete-1', { year: 2024, type: 'INDIVIDUAL' }),
      makeAchievement('a3', 'athlete-1', { year: 2023, type: 'COLLECTIVE' }),
      makeAchievement('a4', 'athlete-2', { year: 2024, type: 'COLLECTIVE' }),
    )

    const all = await sut.execute({ athleteProfileId: 'athlete-1' })
    expect(all.items.map((a) => a.id)).toEqual(['a2', 'a3', 'a1'])

    const collective = await sut.execute({
      athleteProfileId: 'athlete-1',
      type: 'COLLECTIVE',
    })
    expect(collective.items.map((a) => a.id)).toEqual(['a3', 'a1'])

    const year2024 = await sut.execute({
      athleteProfileId: 'athlete-1',
      year: 2024,
    })
    expect(year2024.items.map((a) => a.id)).toEqual(['a2'])
  })
})
