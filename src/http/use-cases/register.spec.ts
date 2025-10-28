import { expect, test, describe, it } from 'vitest'
import { RegisterUseCase } from './register.js'
import { PrismaUsersRepository } from '../repositories/prisma/prisma-users-repository.js'
import { compare } from 'bcryptjs'

describe('Register Use Case', () => {
  it('should hash user password upon registration', async () => {
    const prismaUsersRepository = new PrismaUsersRepository()
    const registerUseCase = new RegisterUseCase(prismaUsersRepository)

    const { user } = await registerUseCase.execute({
      name: 'Test User',
      role: 'ATHLETE',
      email: `test${Date.now()}@example.com`,
      password: '123456',
    })

    const isPasswordCorrectlyHashed = await compare('123456', user.password)

    expect(isPasswordCorrectlyHashed).toBe(true)
  })
})
