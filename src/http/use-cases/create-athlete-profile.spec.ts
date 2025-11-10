import { expect, describe, it, beforeEach } from 'vitest'
import { CreateAthleteProfileUseCase } from './create-athlete-profile.js'
import { InMemoryUsersRepository } from '../repositories/in-memory/in-merory-users-repository.js'
import { InMemoryAthleteProfileRepository } from '../repositories/in-memory/in-memory-athlete-profile-repository.js'
import { hash } from 'bcryptjs'

let usersRepository: InMemoryUsersRepository
let athleteProfileRepository: InMemoryAthleteProfileRepository
let sut: CreateAthleteProfileUseCase

beforeEach(() => {
  usersRepository = new InMemoryUsersRepository()
  athleteProfileRepository = new InMemoryAthleteProfileRepository()
  sut = new CreateAthleteProfileUseCase(
    athleteProfileRepository,
    usersRepository,
  )
})

describe('Create Athlete Profile Use Case', () => {
  it('should be able to create an athlete profile', async () => {
    // Create a user first
    const user = await usersRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: await hash('123456', 6),
      role: 'ATHLETE',
    })

    const { athleteProfile } = await sut.execute({
      userId: user.id,
      cpf: '97456321558', // Valid CPF
      gender: 'MALE',
      nickname: 'Johnny',
      birthDate: '1995-01-15T00:00:00.000Z',
      height: 1.8,
      weight: 75,
      dominantFoot: 'RIGHT',
      primaryPosition: 'FORWARD',
      secondaryPosition: 'MIDFIELDER',
      currentClub: 'São Paulo FC',
      biography: 'Talented young player',
      hasManager: true,
      managerName: 'Carlos Silva',
      managerCompany: 'Silva Sports',
      managerContact: 'carlos@silva.com',
    })

    expect(athleteProfile.id).toEqual(expect.any(String))
    expect(athleteProfile.cpf).toEqual('97456321558')
    expect(athleteProfile.nickname).toEqual('Johnny')
    expect(athleteProfile.primaryPosition).toEqual('FORWARD')
  })

  it('should not be able to create profile for non-existent user', async () => {
    await expect(() =>
      sut.execute({
        userId: 'non-existent-user',
        cpf: '71428793860', // Valid CPF
        gender: 'MALE',
        birthDate: '1995-01-15T00:00:00.000Z',
        height: 1.8,
        weight: 75,
        dominantFoot: 'RIGHT',
        primaryPosition: 'FORWARD',
      }),
    ).rejects.toThrow('User not found')
  })

  it('should not be able to create profile if user already has one', async () => {
    // Create a user first
    const user = await usersRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: await hash('123456', 6),
      role: 'ATHLETE',
    })

    // Create first profile
    await sut.execute({
      userId: user.id,
      cpf: '87748248800', // Valid CPF
      gender: 'MALE',
      birthDate: '1995-01-15T00:00:00.000Z',
      height: 1.8,
      weight: 75,
      dominantFoot: 'RIGHT',
      primaryPosition: 'FORWARD',
    })

    // Try to create second profile
    await expect(() =>
      sut.execute({
        userId: user.id,
        cpf: '877.48248800', // Valid CPF with different format
        gender: 'MALE',
        birthDate: '1996-01-15T00:00:00.000Z',
        height: 1.75,
        weight: 70,
        dominantFoot: 'LEFT',
        primaryPosition: 'MIDFIELDER',
      }),
    ).rejects.toThrow('User already has an athlete profile')
  })

  it('should not be able to create profile with duplicate nickname', async () => {
    // Create first user and profile
    const user1 = await usersRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: await hash('123456', 6),
      role: 'ATHLETE',
    })

    await sut.execute({
      userId: user1.id,
      cpf: '877.482.488-00', // Valid CPF with formatting
      gender: 'MALE',
      nickname: 'Superstar',
      birthDate: '1995-01-15T00:00:00.000Z',
      height: 1.8,
      weight: 75,
      dominantFoot: 'RIGHT',
      primaryPosition: 'FORWARD',
    })

    // Create second user
    const user2 = await usersRepository.create({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: await hash('123456', 6),
      role: 'ATHLETE',
    })

    // Try to create profile with same nickname
    await expect(() =>
      sut.execute({
        userId: user2.id,
        cpf: '877.48248800', // Valid CPF
        gender: 'FEMALE',
        nickname: 'Superstar',
        birthDate: '1996-01-15T00:00:00.000Z',
        height: 1.7,
        weight: 65,
        dominantFoot: 'LEFT',
        primaryPosition: 'MIDFIELDER',
      }),
    ).rejects.toThrow('Nickname already exists')
  })

  it('should update user isProfile flag when creating athlete profile', async () => {
    // Create a user first
    const user = await usersRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: await hash('123456', 6),
      role: 'ATHLETE',
    })

    expect(user.isProfile).toBe(false)

    await sut.execute({
      userId: user.id,
      cpf: '877.482.48800', // Valid CPF with partial formatting
      gender: 'MALE',
      birthDate: '1995-01-15T00:00:00.000Z',
      height: 1.8,
      weight: 75,
      dominantFoot: 'RIGHT',
      primaryPosition: 'FORWARD',
    })

    const updatedUser = await usersRepository.findById(user.id)
    expect(updatedUser?.isProfile).toBe(true)
  })

  it('should not be able to create profile with invalid CPF', async () => {
    // Create a user first
    const user = await usersRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: await hash('123456', 6),
      role: 'ATHLETE',
    })

    await expect(() =>
      sut.execute({
        userId: user.id,
        cpf: '12345678901', // Invalid CPF
        gender: 'MALE',
        birthDate: '1995-01-15T00:00:00.000Z',
        height: 1.8,
        weight: 75,
        dominantFoot: 'RIGHT',
        primaryPosition: 'FORWARD',
      }),
    ).rejects.toThrow('Invalid CPF format')
  })
})
