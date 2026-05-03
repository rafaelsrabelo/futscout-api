import type { AthleteProfile, User } from 'generated/prisma/client.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryAchievementRepository } from '../../repositories/in-memory/in-memory-achievement-repository.js'
import { InMemoryAthleteProfileRepository } from '../../repositories/in-memory/in-memory-athlete-profile-repository.js'

import {
  AthleteNotFoundError,
  CreateAchievementAdminUseCase,
} from './create-achievement.js'
import {
  AchievementNotFoundError,
  DeleteAchievementAdminUseCase,
} from './delete-achievement.js'
import { UpdateAchievementAdminUseCase } from './update-achievement.js'

let achievementRepository: InMemoryAchievementRepository
let athleteRepository: InMemoryAthleteProfileRepository
let createSut: CreateAchievementAdminUseCase
let updateSut: UpdateAchievementAdminUseCase
let deleteSut: DeleteAchievementAdminUseCase

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
  achievementRepository = new InMemoryAchievementRepository()
  athleteRepository = new InMemoryAthleteProfileRepository()
  createSut = new CreateAchievementAdminUseCase(
    achievementRepository,
    athleteRepository,
  )
  updateSut = new UpdateAchievementAdminUseCase(achievementRepository)
  deleteSut = new DeleteAchievementAdminUseCase(achievementRepository)

  athleteRepository.addUser(makeUser('user-1'))
  athleteRepository.items.push(makeAthlete('athlete-1', 'user-1'))
})

describe('Create Achievement Admin', () => {
  it('throws AthleteNotFoundError when athlete does not exist', async () => {
    await expect(
      createSut.execute({
        athleteProfileId: 'ghost',
        name: 'Estadual',
        category: 'U17',
        year: 2024,
        type: 'COLLECTIVE',
      }),
    ).rejects.toBeInstanceOf(AthleteNotFoundError)
  })

  it('creates an achievement linked to the athlete', async () => {
    const achievement = await createSut.execute({
      athleteProfileId: 'athlete-1',
      name: 'Campeonato Estadual',
      category: 'U17',
      year: 2024,
      type: 'COLLECTIVE',
    })

    expect(achievement.athleteId).toBe('athlete-1')
    expect(achievement.name).toBe('Campeonato Estadual')
    expect(achievement.year).toBe(2024)
    expect(achievement.type).toBe('COLLECTIVE')
    expect(achievementRepository.items).toHaveLength(1)
  })
})

describe('Update Achievement Admin', () => {
  it('throws AchievementNotFoundError when not found', async () => {
    await expect(
      updateSut.execute({ achievementId: 'ghost', name: 'X' }),
    ).rejects.toBeInstanceOf(AchievementNotFoundError)
  })

  it('updates allowed fields', async () => {
    const created = await createSut.execute({
      athleteProfileId: 'athlete-1',
      name: 'X',
      category: 'U17',
      year: 2024,
      type: 'COLLECTIVE',
    })

    const updated = await updateSut.execute({
      achievementId: created.id,
      name: 'Melhor Jogador',
      type: 'INDIVIDUAL',
      year: 2025,
    })

    expect(updated.name).toBe('Melhor Jogador')
    expect(updated.type).toBe('INDIVIDUAL')
    expect(updated.year).toBe(2025)
    expect(updated.category).toBe('U17')
  })
})

describe('Delete Achievement Admin', () => {
  it('throws AchievementNotFoundError when not found', async () => {
    await expect(
      deleteSut.execute({ achievementId: 'ghost' }),
    ).rejects.toBeInstanceOf(AchievementNotFoundError)
  })

  it('removes the achievement', async () => {
    const created = await createSut.execute({
      athleteProfileId: 'athlete-1',
      name: 'X',
      category: 'U17',
      year: 2024,
      type: 'COLLECTIVE',
    })

    await deleteSut.execute({ achievementId: created.id })
    expect(achievementRepository.items).toHaveLength(0)
  })
})
