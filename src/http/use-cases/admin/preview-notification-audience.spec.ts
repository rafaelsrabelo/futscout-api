import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryAthleteProfileRepository } from '../../repositories/in-memory/in-memory-athlete-profile-repository.js'
import { InMemoryPushTokensRepository } from '../../repositories/in-memory/in-memory-push-tokens-repository.js'
import { InMemoryUsersRepository } from '../../repositories/in-memory/in-merory-users-repository.js'
import { PreviewNotificationAudienceUseCase } from './preview-notification-audience.js'

let usersRepository: InMemoryUsersRepository
let athleteProfileRepository: InMemoryAthleteProfileRepository
let pushTokensRepository: InMemoryPushTokensRepository
let sut: PreviewNotificationAudienceUseCase

beforeEach(async () => {
  usersRepository = new InMemoryUsersRepository()
  athleteProfileRepository = new InMemoryAthleteProfileRepository()
  pushTokensRepository = new InMemoryPushTokensRepository()
  sut = new PreviewNotificationAudienceUseCase({
    usersRepository,
    athleteProfileRepository,
    pushTokensRepository,
  })

  // 3 atletas (user1=MIDFIELDER, user2=FORWARD, user3=GOALKEEPER) + 1 observer
  await usersRepository.create({
    name: 'User 1',
    email: 'u1@test.com',
    password: 'x',
    role: 'ATHLETE',
  })
  await usersRepository.create({
    name: 'User 2',
    email: 'u2@test.com',
    password: 'x',
    role: 'ATHLETE',
  })
  await usersRepository.create({
    name: 'User 3',
    email: 'u3@test.com',
    password: 'x',
    role: 'ATHLETE',
  })
  await usersRepository.create({
    name: 'Observer 1',
    email: 'o1@test.com',
    password: 'x',
    role: 'OBSERVER',
  })

  const [u1, u2, u3] = usersRepository.items
  // Espelha users no in-memory athlete repo (que filtra por role).
  athleteProfileRepository.users = usersRepository.items

  // Adiciona profiles dos 3 atletas para o filter funcionar.
  athleteProfileRepository.items.push(
    {
      id: 'profile-1',
      userId: u1.id,
      primaryPosition: 'MIDFIELDER',
      classification: 'DESENVOLVIMENTO',
    } as never,
    {
      id: 'profile-2',
      userId: u2.id,
      primaryPosition: 'FORWARD',
      classification: 'PERFORMANCE',
    } as never,
    {
      id: 'profile-3',
      userId: u3.id,
      primaryPosition: 'GOALKEEPER',
      classification: null,
    } as never,
  )
})

describe('Preview Notification Audience Use Case', () => {
  it('should count totals for ALL audience', async () => {
    // 2 dos 4 usuários têm push token
    const [u1, , , o1] = usersRepository.items
    await pushTokensRepository.upsert({
      userId: u1.id,
      token: 'ExponentPushToken[aaaaaaaaaaaaaaaaaa]',
      platform: 'IOS',
    })
    await pushTokensRepository.upsert({
      userId: o1.id,
      token: 'ExponentPushToken[bbbbbbbbbbbbbbbbbb]',
      platform: 'ANDROID',
    })

    const result = await sut.execute({ audience: { type: 'ALL' } })

    expect(result.totalRecipients).toBe(4)
    expect(result.totalWithPushToken).toBe(2)
  })

  it('should count totals for USER_IDS audience and ignore unknown ids', async () => {
    const [u1] = usersRepository.items
    await pushTokensRepository.upsert({
      userId: u1.id,
      token: 'ExponentPushToken[aaaaaaaaaaaaaaaaaa]',
      platform: 'IOS',
    })

    const result = await sut.execute({
      audience: {
        type: 'USER_IDS',
        userIds: [u1.id, 'does-not-exist'],
      },
    })

    expect(result.totalRecipients).toBe(1)
    expect(result.totalWithPushToken).toBe(1)
  })

  it('should count totals for ATHLETE_FILTER by primaryPosition', async () => {
    const [, u2] = usersRepository.items
    await pushTokensRepository.upsert({
      userId: u2.id,
      token: 'ExponentPushToken[ffffffffffffffffff]',
      platform: 'IOS',
    })

    const result = await sut.execute({
      audience: {
        type: 'ATHLETE_FILTER',
        filters: { primaryPosition: 'FORWARD' },
      },
    })

    expect(result.totalRecipients).toBe(1)
    expect(result.totalWithPushToken).toBe(1)
  })

  it('should count totals for ATHLETE_FILTER by classification', async () => {
    const result = await sut.execute({
      audience: {
        type: 'ATHLETE_FILTER',
        filters: { classification: 'DESENVOLVIMENTO' },
      },
    })

    expect(result.totalRecipients).toBe(1)
    expect(result.totalWithPushToken).toBe(0)
  })
})
