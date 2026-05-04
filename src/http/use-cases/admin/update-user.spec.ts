import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryUsersRepository } from '../../repositories/in-memory/in-merory-users-repository.js'
import { CpfAlreadyExistsError } from '../errors/cpf-already-exists-error.js'
import { EmailAlreadyExistsError } from '../errors/email-already-exists-error.js'
import { InvalidCpfError } from '../errors/invalid-cpf-error.js'
import { UserNotFoundError } from './errors/user-not-found-error.js'
import { UpdateUserAdminUseCase } from './update-user.js'

// CPFs válidos pra usar nos testes
const VALID_CPF_A = '52998224725'
const VALID_CPF_B = '11144477735'

let usersRepository: InMemoryUsersRepository
let sut: UpdateUserAdminUseCase

beforeEach(async () => {
  usersRepository = new InMemoryUsersRepository()
  sut = new UpdateUserAdminUseCase(usersRepository)

  await usersRepository.create({
    name: 'Original',
    email: 'orig@example.com',
    cpf: VALID_CPF_A,
    password: 'h',
    role: 'ATHLETE',
  })
  await usersRepository.create({
    name: 'Outro',
    email: 'outro@example.com',
    cpf: VALID_CPF_B,
    password: 'h',
    role: 'OBSERVER',
  })
})

describe('Update User Admin Use Case', () => {
  it('should update name + role', async () => {
    const u = await sut.execute({
      userId: 'user-1',
      name: 'Novo Nome',
      role: 'OBSERVER',
    })
    expect(u.name).toBe('Novo Nome')
    expect(u.role).toBe('OBSERVER')
  })

  it('should set role to null', async () => {
    const u = await sut.execute({ userId: 'user-1', role: null })
    expect(u.role).toBeNull()
  })

  it('should normalize email to lowercase + trim', async () => {
    const u = await sut.execute({
      userId: 'user-1',
      email: '  NEW@Example.com  ',
    })
    expect(u.email).toBe('new@example.com')
  })

  it('should reject duplicated email', async () => {
    await expect(
      sut.execute({ userId: 'user-1', email: 'outro@example.com' }),
    ).rejects.toBeInstanceOf(EmailAlreadyExistsError)
  })

  it('should reject invalid CPF', async () => {
    await expect(
      sut.execute({ userId: 'user-1', cpf: '11111111111' }),
    ).rejects.toBeInstanceOf(InvalidCpfError)
  })

  it('should reject duplicated CPF', async () => {
    await expect(
      sut.execute({ userId: 'user-1', cpf: VALID_CPF_B }),
    ).rejects.toBeInstanceOf(CpfAlreadyExistsError)
  })

  it('should clear CPF when null', async () => {
    const u = await sut.execute({ userId: 'user-1', cpf: null })
    expect(u.cpf).toBeNull()
  })

  it('should throw UserNotFoundError', async () => {
    await expect(
      sut.execute({ userId: 'nope', name: 'X' }),
    ).rejects.toBeInstanceOf(UserNotFoundError)
  })

  it('should toggle isActive / emailVerified / isImported', async () => {
    const u = await sut.execute({
      userId: 'user-1',
      isActive: false,
      emailVerified: true,
      isImported: false,
    })
    expect(u.isActive).toBe(false)
    expect(u.emailVerified).toBe(true)
    expect(u.isImported).toBe(false)
  })
})
