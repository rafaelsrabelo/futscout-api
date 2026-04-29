import { expect, describe, it, beforeEach } from 'vitest'
import { compare } from 'bcryptjs'
import { RegisterUseCase } from './register.js'
import { InMemoryUsersRepository } from '../repositories/in-memory/in-merory-users-repository.js'
import { InMemoryVerificationCodeRepository } from '../repositories/in-memory/in-memory-verification-code-repository.js'
import { CpfAlreadyExistsError } from './errors/cpf-already-exists-error.js'
import { EmailAlreadyExistsError } from './errors/email-already-exists-error.js'
import { InvalidCpfError } from './errors/invalid-cpf-error.js'

let inMemoryUsersRepository: InMemoryUsersRepository
let inMemoryVerificationCodeRepository: InMemoryVerificationCodeRepository
let registerUseCase: RegisterUseCase

beforeEach(() => {
  inMemoryUsersRepository = new InMemoryUsersRepository()
  inMemoryVerificationCodeRepository = new InMemoryVerificationCodeRepository()
  registerUseCase = new RegisterUseCase(
    inMemoryUsersRepository,
    inMemoryVerificationCodeRepository,
  )
})

describe('Register Use Case', () => {
  it('should be able to register a new user', async () => {
    const { user, reactivated } = await registerUseCase.execute({
      name: 'Test User',
      role: 'ATHLETE',
      email: 'test@example.com',
      password: '123456',
      cpf: '97456321558',
    })

    expect(user.id).toEqual(expect.any(String))
    expect(user.cpf).toEqual('97456321558')
    expect(user.isImported).toBe(false)
    expect(reactivated).toBe(false)
  })

  it('should hash user password upon registration', async () => {
    const { user } = await registerUseCase.execute({
      name: 'Test User',
      role: 'ATHLETE',
      email: 'test@example.com',
      password: '123456',
      cpf: '97456321558',
    })

    expect(await compare('123456', user.password)).toBe(true)
  })

  it('should reject invalid CPF', async () => {
    await expect(() =>
      registerUseCase.execute({
        name: 'Bad CPF',
        email: 'bad@example.com',
        password: '123456',
        cpf: '12345678901',
        role: 'ATHLETE',
      }),
    ).rejects.toBeInstanceOf(InvalidCpfError)
  })

  it('should not be able to register with same email twice', async () => {
    await registerUseCase.execute({
      name: 'John Doe',
      email: 'johndoe@example.com',
      password: '123456',
      cpf: '97456321558',
      role: 'ATHLETE',
    })

    await expect(() =>
      registerUseCase.execute({
        name: 'John Doe 2',
        email: 'johndoe@example.com',
        password: '123456',
        cpf: '87748248800',
        role: 'ATHLETE',
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyExistsError)
  })

  it('should reject when CPF exists on a non-imported account', async () => {
    await registerUseCase.execute({
      name: 'Owner',
      email: 'owner@example.com',
      password: '123456',
      cpf: '97456321558',
      role: 'ATHLETE',
    })

    await expect(() =>
      registerUseCase.execute({
        name: 'Impostor',
        email: 'impostor@example.com',
        password: '123456',
        cpf: '97456321558',
        role: 'ATHLETE',
      }),
    ).rejects.toBeInstanceOf(CpfAlreadyExistsError)
  })

  it('should reactivate imported user (replaces email + password, clears flag)', async () => {
    const imported = await inMemoryUsersRepository.create({
      name: 'Atleta Importado',
      email: '97456321558@futscore.club',
      cpf: '97456321558',
      password: 'placeholder-hash',
      role: 'ATHLETE',
      isImported: true,
    })

    const { user, reactivated } = await registerUseCase.execute({
      name: 'Atleta Real',
      email: 'atleta@example.com',
      password: 'novaSenha',
      cpf: '97456321558',
      role: 'ATHLETE',
    })

    expect(reactivated).toBe(true)
    expect(user.id).toEqual(imported.id)
    expect(user.email).toEqual('atleta@example.com')
    expect(user.name).toEqual('Atleta Real')
    expect(user.isImported).toBe(false)
    expect(await compare('novaSenha', user.password)).toBe(true)
  })

  it('should block reactivation if new email belongs to another user', async () => {
    await inMemoryUsersRepository.create({
      name: 'Outro',
      email: 'taken@example.com',
      cpf: '87748248800',
      password: 'x',
      role: 'ATHLETE',
    })

    await inMemoryUsersRepository.create({
      name: 'Atleta Importado',
      email: '97456321558@futscore.club',
      cpf: '97456321558',
      password: 'placeholder-hash',
      role: 'ATHLETE',
      isImported: true,
    })

    await expect(() =>
      registerUseCase.execute({
        name: 'Atleta Real',
        email: 'taken@example.com',
        password: 'novaSenha',
        cpf: '97456321558',
        role: 'ATHLETE',
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyExistsError)
  })
})
