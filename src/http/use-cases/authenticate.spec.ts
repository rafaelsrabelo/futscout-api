import { expect, describe, it, beforeEach } from 'vitest'
import { InMemoryUsersRepository } from '../repositories/in-memory/in-merory-users-repository.js'
import { AuthenticateUseCase } from './authenticate.js'
import { hash } from 'bcryptjs'
import { InvalidCredentialsError } from './errors/invalid-credentials-error.js'

let usersRepository: InMemoryUsersRepository
let sut: AuthenticateUseCase

beforeEach(() => {
  usersRepository = new InMemoryUsersRepository()
  sut = new AuthenticateUseCase(usersRepository)
})

describe('Authenticate Use Case', () => {
  it('should be able to authenticate', async () => {
    await usersRepository.create({
      name: 'Rafael Rabelo',
      email: 'rafaelrabelodev@gmail.com',
      password: await hash('123456', 6),
      role: 'ATHLETE',
    })

    const { user } = await sut.execute({
      email: `rafaelrabelodev@gmail.com`,
      password: '123456',
    })
    await expect(user.id).toEqual(expect.any(String))
  })

  it('should not be able to authenticate with wrong email', async () => {
    await expect(() =>
      sut.execute({
        email: `wrongemail@example.com`,
        password: '123456',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError)
  })

  it('should not be able to authenticate with wrong password', async () => {
    await usersRepository.create({
      name: 'Rafael Rabelo',
      email: 'rafaelrabelodev@gmail.com',
      password: await hash('123456', 6),
      role: 'ATHLETE',
    })
  })

  it('should not be able to authenticate with wrong password', async () => {
    await usersRepository.create({
      name: 'Rafael Rabelo',
      email: 'rafaelrabelodev@gmail.com',
      password: await hash('123456', 6),
      role: 'ATHLETE',
    })

    await expect(() =>
      sut.execute({
        email: 'rafaelrabelodev@gmail.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError)
  })
})
