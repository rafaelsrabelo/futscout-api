import { compare } from 'bcryptjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { InMemoryUsersRepository } from '../http/repositories/in-memory/in-merory-users-repository.js'
import { seedAdmin } from './admin.js'

let usersRepository: InMemoryUsersRepository

beforeEach(() => {
  usersRepository = new InMemoryUsersRepository()
})

describe('seedAdmin', () => {
  it('should create an admin user when none exists and credentials are provided', async () => {
    await seedAdmin({
      usersRepository,
      email: 'admin@futscout.com',
      password: 'super-secret-123',
    })

    expect(usersRepository.items).toHaveLength(1)

    const [admin] = usersRepository.items
    expect(admin?.email).toBe('admin@futscout.com')
    expect(admin?.role).toBe('ADMIN')
    expect(admin?.isActive).toBe(true)
    expect(admin?.emailVerified).toBe(true)
    expect(admin?.isProfile).toBe(true)

    const passwordMatches = await compare('super-secret-123', admin!.password)
    expect(passwordMatches).toBe(true)
  })

  it('should be idempotent when an admin already exists', async () => {
    await usersRepository.create({
      name: 'Existing Admin',
      email: 'existing@futscout.com',
      password: 'already-hashed',
      role: 'ADMIN',
    })

    await seedAdmin({
      usersRepository,
      email: 'admin@futscout.com',
      password: 'super-secret-123',
    })

    expect(usersRepository.items).toHaveLength(1)
    expect(usersRepository.items[0]?.email).toBe('existing@futscout.com')
  })

  it('should skip creation and warn when credentials are missing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await seedAdmin({ usersRepository })

    expect(usersRepository.items).toHaveLength(0)
    expect(warnSpy).toHaveBeenCalledTimes(1)

    warnSpy.mockRestore()
  })
})
