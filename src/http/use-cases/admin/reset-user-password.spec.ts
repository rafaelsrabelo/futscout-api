import { compare } from 'bcryptjs'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryUsersRepository } from '../../repositories/in-memory/in-merory-users-repository.js'
import type { RefreshTokenRepository } from '../../repositories/refresh-token-repository.js'

import { UserNotFoundError } from './errors/user-not-found-error.js'
import { ResetUserPasswordAdminUseCase } from './reset-user-password.js'

class FakeRefreshTokenRepository implements RefreshTokenRepository {
  public deletedUserIds: string[] = []
  async create() {
    throw new Error('not used')
  }

  async findByToken() {
    return null
  }

  async deleteByToken() {
    /* not used */
  }

  async deleteAllByUserId(userId: string) {
    this.deletedUserIds.push(userId)
  }
}

let usersRepository: InMemoryUsersRepository
let refreshTokenRepository: FakeRefreshTokenRepository
let sut: ResetUserPasswordAdminUseCase

beforeEach(async () => {
  usersRepository = new InMemoryUsersRepository()
  refreshTokenRepository = new FakeRefreshTokenRepository()
  sut = new ResetUserPasswordAdminUseCase(
    usersRepository,
    refreshTokenRepository,
  )

  await usersRepository.create({
    name: 'Alvo',
    email: 'alvo@example.com',
    password: 'old-hash',
    role: 'ATHLETE',
  })
})

describe('Reset User Password Admin Use Case', () => {
  it('should hash new password and store it', async () => {
    await sut.execute({ userId: 'user-1', newPassword: 'NovaSenha123' })
    const updated = await usersRepository.findById('user-1')
    expect(updated?.password).not.toBe('old-hash')
    expect(await compare('NovaSenha123', updated!.password)).toBe(true)
  })

  it('should invalidate refresh tokens', async () => {
    await sut.execute({ userId: 'user-1', newPassword: 'X12345678' })
    expect(refreshTokenRepository.deletedUserIds).toEqual(['user-1'])
  })

  it('should throw UserNotFoundError when user does not exist', async () => {
    await expect(
      sut.execute({ userId: 'nope', newPassword: 'X12345678' }),
    ).rejects.toBeInstanceOf(UserNotFoundError)
  })
})
