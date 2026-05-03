import { compare } from 'bcryptjs'
import type { AthleteProfile, User } from 'generated/prisma/client.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryAthleteProfileRepository } from '../../repositories/in-memory/in-memory-athlete-profile-repository.js'
import { InMemoryUsersRepository } from '../../repositories/in-memory/in-merory-users-repository.js'
import type { RefreshTokenRepository } from '../../repositories/refresh-token-repository.js'

import {
  AthleteNotFoundError,
  ResetAthletePasswordAdminUseCase,
} from './reset-athlete-password.js'

class FakeRefreshTokenRepository implements RefreshTokenRepository {
  public deletedUserIds: string[] = []
  async create() {
    throw new Error('not used')
  }

  async findByToken() {
    return null
  }

  async deleteByToken() {
    /* not used */
  }

  async deleteAllByUserId(userId: string) {
    this.deletedUserIds.push(userId)
  }
}

let athleteRepository: InMemoryAthleteProfileRepository
let usersRepository: InMemoryUsersRepository
let refreshTokenRepository: FakeRefreshTokenRepository
let sut: ResetAthletePasswordAdminUseCase

function makeUser(id: string, password = 'old-hash'): User {
  return {
    id,
    email: `${id}@x.com`,
    cpf: null,
    name: `Nome ${id}`,
    password,
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
  athleteRepository = new InMemoryAthleteProfileRepository()
  usersRepository = new InMemoryUsersRepository()
  refreshTokenRepository = new FakeRefreshTokenRepository()
  sut = new ResetAthletePasswordAdminUseCase(
    athleteRepository,
    usersRepository,
    refreshTokenRepository,
  )

  const user = makeUser('user-1')
  usersRepository.items.push(user)
  athleteRepository.addUser(user)
  athleteRepository.items.push(makeAthlete('athlete-1', 'user-1'))
})

describe('Reset Athlete Password Admin Use Case', () => {
  it('throws AthleteNotFoundError when athlete does not exist', async () => {
    await expect(
      sut.execute({ athleteProfileId: 'ghost', newPassword: 'novaSenha123' }),
    ).rejects.toBeInstanceOf(AthleteNotFoundError)
  })

  it('hashes the new password and saves on the user', async () => {
    await sut.execute({
      athleteProfileId: 'athlete-1',
      newPassword: 'novaSenha123',
    })

    const user = usersRepository.items[0]!
    expect(user.password).not.toBe('novaSenha123')
    expect(user.password).not.toBe('old-hash')
    expect(await compare('novaSenha123', user.password)).toBe(true)
  })

  it('invalidates refresh tokens of the athlete', async () => {
    await sut.execute({
      athleteProfileId: 'athlete-1',
      newPassword: 'outraSenha123',
    })

    expect(refreshTokenRepository.deletedUserIds).toEqual(['user-1'])
  })
})
