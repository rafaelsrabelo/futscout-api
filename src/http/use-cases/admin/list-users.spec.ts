import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryUsersRepository } from '../../repositories/in-memory/in-merory-users-repository.js'
import { ListUsersAdminUseCase } from './list-users.js'

let usersRepository: InMemoryUsersRepository
let sut: ListUsersAdminUseCase

beforeEach(async () => {
  usersRepository = new InMemoryUsersRepository()
  sut = new ListUsersAdminUseCase(usersRepository)

  // Seed: 1 athlete premium, 2 athletes free, 1 observer, 1 sem role
  await usersRepository.create({
    name: 'Atleta Premium',
    email: 'premium@example.com',
    cpf: '11111111111',
    password: 'h',
    role: 'ATHLETE',
  })
  await usersRepository.create({
    name: 'Atleta Free Um',
    email: 'free1@example.com',
    cpf: '22222222222',
    password: 'h',
    role: 'ATHLETE',
  })
  await usersRepository.create({
    name: 'Atleta Free Dois',
    email: 'free2@example.com',
    cpf: '33333333333',
    password: 'h',
    role: 'ATHLETE',
  })
  await usersRepository.create({
    name: 'Olheiro Carlos',
    email: 'olheiro@example.com',
    cpf: '44444444444',
    password: 'h',
    role: 'OBSERVER',
  })
  await usersRepository.create({
    name: 'Sem Role',
    email: 'norole@example.com',
    cpf: '55555555555',
    password: 'h',
    role: null,
  })

  // Marca premium e profiles
  usersRepository.athleteProfileUserIds.add('user-1')
  usersRepository.athleteProfileUserIds.add('user-2')
  usersRepository.athleteProfileUserIds.add('user-3')
  usersRepository.observerProfileUserIds.add('user-4')
  usersRepository.premiumUserIds.add('user-1')
})

describe('List Users Admin Use Case', () => {
  it('should return all users with pagination defaults', async () => {
    const result = await sut.execute({})
    expect(result.total).toBe(5)
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(20)
    expect(result.items.length).toBe(5)
  })

  it('should filter by role ATHLETE', async () => {
    const result = await sut.execute({ role: 'ATHLETE' })
    expect(result.total).toBe(3)
    for (const u of result.items) expect(u.role).toBe('ATHLETE')
  })

  it('should filter by role OBSERVER', async () => {
    const result = await sut.execute({ role: 'OBSERVER' })
    expect(result.total).toBe(1)
    expect(result.items[0]!.email).toBe('olheiro@example.com')
  })

  it('should filter by role "none" (sem role definido)', async () => {
    const result = await sut.execute({ role: 'none' })
    expect(result.total).toBe(1)
    expect(result.items[0]!.role).toBeNull()
  })

  it('should search by name (case insensitive)', async () => {
    const result = await sut.execute({ q: 'premium' })
    expect(result.total).toBe(1)
    expect(result.items[0]!.email).toBe('premium@example.com')
  })

  it('should search by partial CPF', async () => {
    const result = await sut.execute({ q: '44444' })
    expect(result.total).toBe(1)
    expect(result.items[0]!.email).toBe('olheiro@example.com')
  })

  it('should mark activePlan as PREMIUM and FREE accordingly', async () => {
    const result = await sut.execute({ role: 'ATHLETE' })
    const premium = result.items.find((u) => u.email === 'premium@example.com')
    const free = result.items.find((u) => u.email === 'free1@example.com')
    expect(premium?.activePlan).toBe('PREMIUM')
    expect(free?.activePlan).toBe('FREE')
  })

  it('should mark hasAthleteProfile and hasObserverProfile correctly', async () => {
    const result = await sut.execute({})
    const obs = result.items.find((u) => u.email === 'olheiro@example.com')
    const atl = result.items.find((u) => u.email === 'free1@example.com')
    const norole = result.items.find((u) => u.email === 'norole@example.com')
    expect(obs?.hasObserverProfile).toBe(true)
    expect(obs?.hasAthleteProfile).toBe(false)
    expect(atl?.hasAthleteProfile).toBe(true)
    expect(atl?.hasObserverProfile).toBe(false)
    expect(norole?.hasAthleteProfile).toBe(false)
    expect(norole?.hasObserverProfile).toBe(false)
  })

  it('should clamp pageSize to max 100', async () => {
    const result = await sut.execute({ pageSize: 999 })
    expect(result.pageSize).toBe(100)
  })

  it('should clamp page to min 1', async () => {
    const result = await sut.execute({ page: 0 })
    expect(result.page).toBe(1)
  })
})
