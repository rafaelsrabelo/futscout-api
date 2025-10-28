import { expect, describe, it, beforeEach } from 'vitest'
import { RegisterUseCase } from './register.js'
import { compare } from 'bcryptjs'
import { InMemoryUsersRepository } from '../repositories/in-memory/in-merory-users-repository.js'
import { InMemoryVerificationCodeRepository } from '../repositories/in-memory/in-memory-verification-code-repository.js'
import { EmailAlreadyExistsError } from './errors/email-already-exists-error.js'

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
    const { user } = await registerUseCase.execute({
      name: 'Test User',
      role: 'ATHLETE',
      email: `test${Date.now()}@example.com`,
      password: '123456',
    })

    await expect(user.id).toEqual(expect.any(String))
  })

  it('should hash user password upon registration', async () => {
    const { user } = await registerUseCase.execute({
      name: 'Test User',
      role: 'ATHLETE',
      email: `test${Date.now()}@example.com`,
      password: '123456',
    })

    const isPasswordCorrectlyHashed = await compare('123456', user.password)

    await expect(isPasswordCorrectlyHashed).toBe(true)
  })

  it('should not be able to register with same email twice', async () => {
    const email = 'johndoe@example.com'

    await registerUseCase.execute({
      name: 'John Doe',
      email,
      password: '123456',
      role: 'ATHLETE',
    })

    await expect(() =>
      registerUseCase.execute({
        name: 'John Doe',
        email,
        password: '123456',
        role: 'ATHLETE',
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyExistsError)
  })

  it('should be able to register with default role when role is not provided', async () => {
    const { user } = await registerUseCase.execute({
      name: 'Jane Doe',
      email: 'janedoe@example.com',
      password: '123456',
      role: 'ATHLETE',
    })

    expect(user.id).toEqual(expect.any(String))
    expect(user.name).toEqual('Jane Doe')
    expect(user.email).toEqual('janedoe@example.com')
    expect(user.role).toEqual('ATHLETE')
  })
})
