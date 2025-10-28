import { expect, describe, it, beforeEach } from 'vitest'
import { ListAthletesUseCase } from './list-athletes.js'
import { InMemoryAthleteProfileRepository } from '../repositories/in-memory/in-memory-athlete-profile-repository.js'
import type { User } from 'generated/prisma/client.js'

let athleteProfileRepository: InMemoryAthleteProfileRepository
let sut: ListAthletesUseCase

beforeEach(async () => {
  athleteProfileRepository = new InMemoryAthleteProfileRepository()
  sut = new ListAthletesUseCase(athleteProfileRepository)

  // Add some test users
  const user1: User = {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    password: 'hashed',
    role: 'ATHLETE',
    isActive: true,
    isProfile: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const user2: User = {
    id: 'user-2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: 'hashed',
    role: 'ATHLETE',
    isActive: true,
    isProfile: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const user3: User = {
    id: 'user-3',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    password: 'hashed',
    role: 'ATHLETE',
    isActive: true,
    isProfile: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  athleteProfileRepository.addUser(user1)
  athleteProfileRepository.addUser(user2)
  athleteProfileRepository.addUser(user3)

  // Create athlete profiles
  await athleteProfileRepository.create({
    userId: 'user-1',
    cpf: '12345678901',
    gender: 'MALE',
    nickname: 'Johnny',
    birthDate: '1995-01-15T00:00:00.000Z',
    height: 1.8,
    weight: 75,
    dominantFoot: 'RIGHT',
    primaryPosition: 'FORWARD',
    currentClub: 'São Paulo FC',
    hasManager: true,
  })

  await athleteProfileRepository.create({
    userId: 'user-2',
    cpf: '98765432109',
    gender: 'FEMALE',
    nickname: 'Jane',
    birthDate: '1996-03-20T00:00:00.000Z',
    height: 1.65,
    weight: 60,
    dominantFoot: 'LEFT',
    primaryPosition: 'MIDFIELDER',
    currentClub: 'Corinthians',
    hasManager: false,
  })

  await athleteProfileRepository.create({
    userId: 'user-3',
    cpf: '11122233344',
    gender: 'MALE',
    nickname: 'Bobby',
    birthDate: '1994-07-10T00:00:00.000Z',
    height: 1.9,
    weight: 85,
    dominantFoot: 'RIGHT',
    primaryPosition: 'GOALKEEPER',
    currentClub: 'Palmeiras',
    hasManager: true,
  })
})

describe('List Athletes Use Case', () => {
  it('should be able to list all athletes', async () => {
    const { athletes } = await sut.execute({})

    expect(athletes).toHaveLength(3)
    expect(athletes[0]).toEqual(
      expect.objectContaining({
        user: expect.objectContaining({
          name: expect.any(String),
        }),
      }),
    )
  })

  it('should be able to filter athletes by gender', async () => {
    const { athletes } = await sut.execute({
      gender: 'MALE',
    })

    expect(athletes).toHaveLength(2)
    expect(athletes.every((athlete) => athlete.gender === 'MALE')).toBe(true)
  })

  it('should be able to filter athletes by dominant foot', async () => {
    const { athletes } = await sut.execute({
      dominantFoot: 'LEFT',
    })

    expect(athletes).toHaveLength(1)
    expect(athletes[0]?.dominantFoot).toBe('LEFT')
    expect(athletes[0]?.nickname).toBe('Jane')
  })

  it('should be able to filter athletes by primary position', async () => {
    const { athletes } = await sut.execute({
      primaryPosition: 'FORWARD',
    })

    expect(athletes).toHaveLength(1)
    expect(athletes[0]?.primaryPosition).toBe('FORWARD')
    expect(athletes[0]?.nickname).toBe('Johnny')
  })

  it('should be able to filter athletes by current club', async () => {
    const { athletes } = await sut.execute({
      currentClub: 'São Paulo',
    })

    expect(athletes).toHaveLength(1)
    expect(athletes[0]?.currentClub).toBe('São Paulo FC')
  })

  it('should be able to filter athletes by manager status', async () => {
    const { athletes } = await sut.execute({
      hasManager: true,
    })

    expect(athletes).toHaveLength(2)
    expect(athletes.every((athlete) => athlete.hasManager === true)).toBe(true)
  })

  it('should be able to filter athletes by height range', async () => {
    const { athletes } = await sut.execute({
      minHeight: 1.7,
      maxHeight: 1.85,
    })

    expect(athletes).toHaveLength(1)
    expect(athletes[0]?.height).toBe(1.8)
    expect(athletes[0]?.nickname).toBe('Johnny')
  })

  it('should be able to filter athletes by weight range', async () => {
    const { athletes } = await sut.execute({
      minWeight: 70,
      maxWeight: 80,
    })

    expect(athletes).toHaveLength(1)
    expect(athletes[0]?.weight).toBe(75)
    expect(athletes[0]?.nickname).toBe('Johnny')
  })

  it('should be able to combine multiple filters', async () => {
    const { athletes } = await sut.execute({
      gender: 'MALE',
      dominantFoot: 'RIGHT',
      hasManager: true,
    })

    expect(athletes).toHaveLength(2)
    expect(
      athletes.every(
        (athlete) =>
          athlete.gender === 'MALE' &&
          athlete.dominantFoot === 'RIGHT' &&
          athlete.hasManager === true,
      ),
    ).toBe(true)
  })

  it('should return empty array when no athletes match filters', async () => {
    const { athletes } = await sut.execute({
      gender: 'OTHER',
    })

    expect(athletes).toHaveLength(0)
  })
})
