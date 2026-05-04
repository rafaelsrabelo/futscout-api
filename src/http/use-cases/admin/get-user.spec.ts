import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryUsersRepository } from '../../repositories/in-memory/in-merory-users-repository.js'
import { UserNotFoundError } from './errors/user-not-found-error.js'
import { GetUserAdminUseCase } from './get-user.js'

let usersRepository: InMemoryUsersRepository
let sut: GetUserAdminUseCase

beforeEach(async () => {
  usersRepository = new InMemoryUsersRepository()
  sut = new GetUserAdminUseCase(usersRepository)

  await usersRepository.create({
    name: 'Atleta Premium',
    email: 'premium@example.com',
    cpf: '11111111111',
    password: 'h',
    role: 'ATHLETE',
  })
  usersRepository.athleteProfileIdByUser.set('user-1', 'athlete-1')
  usersRepository.premiumUserIds.add('user-1')
})

describe('Get User Admin Use Case', () => {
  it('should return user with profile + plan info', async () => {
    const detail = await sut.execute({ userId: 'user-1' })
    expect(detail.user.email).toBe('premium@example.com')
    expect(detail.athleteProfileId).toBe('athlete-1')
    expect(detail.observerProfileId).toBeNull()
    expect(detail.activePlan).toBe('PREMIUM')
  })

  it('should throw UserNotFoundError when user does not exist', async () => {
    await expect(sut.execute({ userId: 'inexistente' })).rejects.toBeInstanceOf(
      UserNotFoundError,
    )
  })
})
