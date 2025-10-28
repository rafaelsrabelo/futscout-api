import { expect, describe, it } from 'vitest'
import { RegisterUseCase } from './register.js'
import { compare } from 'bcryptjs'

describe('Register Use Case', () => {
  it('should hash user password upon registration', async () => {
    const registerUseCase = new RegisterUseCase({
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async findByEmail(email: string) {
        return null
      },
      async create(data) {
        return {
          id: 'user-1',
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role!,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      },
    })

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
