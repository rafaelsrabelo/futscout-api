import type { AthleteProfile, User } from 'generated/prisma/client.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryAthleteClassificationLogRepository } from '../../repositories/in-memory/in-memory-athlete-classification-log-repository.js'
import { InMemoryAthleteProfileRepository } from '../../repositories/in-memory/in-memory-athlete-profile-repository.js'

import { AthleteNotFoundError } from './errors/athlete-not-found-error.js'
import { ListAthleteClassificationHistoryUseCase } from './list-athlete-classification-history.js'
import { SetAthleteClassificationUseCase } from './set-athlete-classification.js'

let athleteRepository: InMemoryAthleteProfileRepository
let logRepository: InMemoryAthleteClassificationLogRepository
let sut: SetAthleteClassificationUseCase
let listHistorySut: ListAthleteClassificationHistoryUseCase

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
    classification: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  } as AthleteProfile
}

beforeEach(() => {
  athleteRepository = new InMemoryAthleteProfileRepository()
  logRepository = new InMemoryAthleteClassificationLogRepository()
  sut = new SetAthleteClassificationUseCase(athleteRepository, logRepository)
  listHistorySut = new ListAthleteClassificationHistoryUseCase(
    athleteRepository,
    logRepository,
  )

  athleteRepository.addUser(makeUser('user-1'))
  athleteRepository.addUser({ ...makeUser('admin-1'), role: 'ADMIN' })
  athleteRepository.items.push(makeAthlete('athlete-1', 'user-1'))
  logRepository.registerAdmin({
    id: 'admin-1',
    name: 'Admin Um',
    email: 'admin-1@x.com',
  })
})

describe('Set Athlete Classification Admin', () => {
  it('classifies an athlete as DESENVOLVIMENTO and writes a log entry', async () => {
    const { athleteProfile, log } = await sut.execute({
      athleteProfileId: 'athlete-1',
      classification: 'DESENVOLVIMENTO',
      adminUserId: 'admin-1',
    })

    expect(athleteProfile.classification).toBe('DESENVOLVIMENTO')
    expect(log.classification).toBe('DESENVOLVIMENTO')
    expect(log.classifiedById).toBe('admin-1')
    expect(logRepository.items).toHaveLength(1)
  })

  it('persists the comment in the log entry', async () => {
    const { log } = await sut.execute({
      athleteProfileId: 'athlete-1',
      classification: 'PERFORMANCE',
      comment: 'Evolução técnica notável nos últimos 3 meses',
      adminUserId: 'admin-1',
    })

    expect(log.comment).toBe('Evolução técnica notável nos últimos 3 meses')
  })

  it('reclassifies and keeps full history (snapshot reflects last)', async () => {
    await sut.execute({
      athleteProfileId: 'athlete-1',
      classification: 'DESENVOLVIMENTO',
      comment: 'Avaliação inicial',
      adminUserId: 'admin-1',
    })
    await new Promise((resolve) => setTimeout(resolve, 2))
    await sut.execute({
      athleteProfileId: 'athlete-1',
      classification: 'PERFORMANCE',
      comment: 'Promovido para performance',
      adminUserId: 'admin-1',
    })

    const profile = await athleteRepository.findByUserId('user-1')
    expect(profile?.classification).toBe('PERFORMANCE')

    const history = await listHistorySut.execute({
      athleteProfileId: 'athlete-1',
    })
    expect(history.total).toBe(2)
    expect(history.items[0].classification).toBe('PERFORMANCE')
    expect(history.items[1].classification).toBe('DESENVOLVIMENTO')
  })

  it('clears classification when null is passed and logs the removal', async () => {
    await sut.execute({
      athleteProfileId: 'athlete-1',
      classification: 'PERFORMANCE',
      adminUserId: 'admin-1',
    })

    const { athleteProfile, log } = await sut.execute({
      athleteProfileId: 'athlete-1',
      classification: null,
      comment: 'Reverter classificação até nova avaliação',
      adminUserId: 'admin-1',
    })

    expect(athleteProfile.classification).toBeNull()
    expect(log.classification).toBeNull()
    expect(log.comment).toBe('Reverter classificação até nova avaliação')
  })

  it('throws AthleteNotFoundError when athlete does not exist', async () => {
    await expect(
      sut.execute({
        athleteProfileId: 'ghost',
        classification: 'DESENVOLVIMENTO',
        adminUserId: 'admin-1',
      }),
    ).rejects.toBeInstanceOf(AthleteNotFoundError)
  })
})

describe('List Athlete Classification History Admin', () => {
  it('returns empty history when athlete has never been classified', async () => {
    const result = await listHistorySut.execute({
      athleteProfileId: 'athlete-1',
    })
    expect(result.items).toHaveLength(0)
    expect(result.total).toBe(0)
  })

  it('throws AthleteNotFoundError when athlete does not exist', async () => {
    await expect(
      listHistorySut.execute({ athleteProfileId: 'ghost' }),
    ).rejects.toBeInstanceOf(AthleteNotFoundError)
  })

  it('paginates results', async () => {
    for (let i = 0; i < 5; i++) {
      await sut.execute({
        athleteProfileId: 'athlete-1',
        classification: i % 2 === 0 ? 'DESENVOLVIMENTO' : 'PERFORMANCE',
        adminUserId: 'admin-1',
      })
      await new Promise((resolve) => setTimeout(resolve, 1))
    }

    const page1 = await listHistorySut.execute({
      athleteProfileId: 'athlete-1',
      page: 1,
      pageSize: 2,
    })
    expect(page1.items).toHaveLength(2)
    expect(page1.total).toBe(5)
    expect(page1.hasMore).toBe(true)

    const page3 = await listHistorySut.execute({
      athleteProfileId: 'athlete-1',
      page: 3,
      pageSize: 2,
    })
    expect(page3.items).toHaveLength(1)
    expect(page3.hasMore).toBe(false)
  })

  it('exposes admin profile in each entry', async () => {
    await sut.execute({
      athleteProfileId: 'athlete-1',
      classification: 'PERFORMANCE',
      adminUserId: 'admin-1',
    })

    const { items } = await listHistorySut.execute({
      athleteProfileId: 'athlete-1',
    })
    expect(items[0].classifiedBy.id).toBe('admin-1')
    expect(items[0].classifiedBy.name).toBe('Admin Um')
  })
})
