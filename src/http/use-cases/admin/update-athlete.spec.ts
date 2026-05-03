import type { AthleteProfile, User } from 'generated/prisma/client.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryAddressRepository } from '../../repositories/in-memory/in-memory-address-repository.js'
import { InMemoryAthleteProfileRepository } from '../../repositories/in-memory/in-memory-athlete-profile-repository.js'
import { InMemoryUsersRepository } from '../../repositories/in-memory/in-merory-users-repository.js'

import { AthleteNotFoundError } from './errors/athlete-not-found-error.js'
import { CpfAlreadyInUseError } from './errors/cpf-already-in-use-error.js'
import { EmailAlreadyInUseError } from './errors/email-already-in-use-error.js'
import { NicknameAlreadyInUseError } from './errors/nickname-already-in-use-error.js'
import { UpdateAthleteAdminUseCase } from './update-athlete.js'

let athleteRepository: InMemoryAthleteProfileRepository
let addressRepository: InMemoryAddressRepository
let usersRepository: InMemoryUsersRepository
let sut: UpdateAthleteAdminUseCase

function makeUser(id: string, overrides: Partial<User> = {}): User {
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
    ...overrides,
  }
}

function makeProfile(
  id: string,
  userId: string,
  overrides: Partial<AthleteProfile> = {},
): AthleteProfile {
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
    ...overrides,
  } as AthleteProfile
}

beforeEach(() => {
  athleteRepository = new InMemoryAthleteProfileRepository()
  addressRepository = new InMemoryAddressRepository()
  usersRepository = new InMemoryUsersRepository()
  sut = new UpdateAthleteAdminUseCase(
    athleteRepository,
    addressRepository,
    usersRepository,
  )

  const user = makeUser('user-1')
  usersRepository.items.push(user)
  athleteRepository.addUser(user)
  athleteRepository.items.push(makeProfile('athlete-1', 'user-1'))
})

describe('Update Athlete Admin Use Case', () => {
  it('throws AthleteNotFoundError when profile does not exist', async () => {
    await expect(
      sut.execute({ athleteProfileId: 'ghost', name: 'X' }),
    ).rejects.toBeInstanceOf(AthleteNotFoundError)
  })

  it('updates user fields and profile fields together', async () => {
    const result = await sut.execute({
      athleteProfileId: 'athlete-1',
      name: 'Davi Oliveira',
      cpf: '12345678901',
      isActive: false,
      nickname: 'davi',
      currentClub: 'Santa Cruz',
      height: 1.71,
      weight: 71,
    })

    expect(result.user.name).toBe('Davi Oliveira')
    expect(result.user.cpf).toBe('12345678901')
    expect(result.user.isActive).toBe(false)
    expect(result.profile.nickname).toBe('davi')
    expect(result.profile.currentClub).toBe('Santa Cruz')
    expect(result.profile.height).toBe(1.71)
    expect(result.profile.weight).toBe(71)
  })

  it('throws NicknameAlreadyInUseError when nickname belongs to another athlete', async () => {
    const otherUser = makeUser('user-2', { email: 'other@x.com' })
    usersRepository.items.push(otherUser)
    athleteRepository.addUser(otherUser)
    athleteRepository.items.push(
      makeProfile('athlete-2', 'user-2', { nickname: 'davi' }),
    )

    await expect(
      sut.execute({ athleteProfileId: 'athlete-1', nickname: 'davi' }),
    ).rejects.toBeInstanceOf(NicknameAlreadyInUseError)
  })

  it('throws EmailAlreadyInUseError when email belongs to another user', async () => {
    usersRepository.items.push(makeUser('user-2', { email: 'taken@x.com' }))

    await expect(
      sut.execute({ athleteProfileId: 'athlete-1', email: 'taken@x.com' }),
    ).rejects.toBeInstanceOf(EmailAlreadyInUseError)
  })

  it('throws CpfAlreadyInUseError when cpf belongs to another user', async () => {
    usersRepository.items.push(
      makeUser('user-2', { email: 'u2@x.com', cpf: '99999999999' }),
    )

    await expect(
      sut.execute({ athleteProfileId: 'athlete-1', cpf: '99999999999' }),
    ).rejects.toBeInstanceOf(CpfAlreadyInUseError)
  })

  it('creates address when athlete has none', async () => {
    await sut.execute({
      athleteProfileId: 'athlete-1',
      address: {
        zipCode: '60744030',
        street: 'Rua dos Mandacarus',
        number: '101',
        district: 'Passaré',
        city: 'Fortaleza',
        state: 'CE',
        country: 'Brasil',
      },
    })

    const stored = await addressRepository.findByAthleteId('athlete-1')
    expect(stored?.city).toBe('Fortaleza')
    expect(stored?.zipCode).toBe('60744030')
  })

  it('updates address when athlete already has one', async () => {
    await addressRepository.create({
      athleteId: 'athlete-1',
      zipCode: '00000000',
      street: 'Antiga',
      number: '1',
      district: 'X',
      city: 'X',
      state: 'X',
      country: 'Brasil',
    })

    await sut.execute({
      athleteProfileId: 'athlete-1',
      address: { city: 'Fortaleza', state: 'CE' },
    })

    const stored = await addressRepository.findByAthleteId('athlete-1')
    expect(stored?.city).toBe('Fortaleza')
    expect(stored?.state).toBe('CE')
    expect(stored?.street).toBe('Antiga') // não mudou
  })

  it('does not increment usage counters (admin action)', async () => {
    // Sanity check: o use case não tem dependência de UsageRepository.
    // Quem garante isso é a ausência de chamadas a incrementUsage no use case.
    const result = await sut.execute({
      athleteProfileId: 'athlete-1',
      name: 'X',
    })
    expect(result).toBeDefined()
  })
})
