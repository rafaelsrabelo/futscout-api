import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryPushTokensRepository } from '../repositories/in-memory/in-memory-push-tokens-repository.js'
import { RemovePushTokenUseCase } from './remove-push-token.js'

const TOKEN_A = 'ExponentPushToken[aaaaaaaaaaaaaaaaaa]'
const TOKEN_B = 'ExponentPushToken[bbbbbbbbbbbbbbbbbb]'

let pushTokensRepository: InMemoryPushTokensRepository
let sut: RemovePushTokenUseCase

beforeEach(() => {
  pushTokensRepository = new InMemoryPushTokensRepository()
  sut = new RemovePushTokenUseCase(pushTokensRepository)
})

describe('Remove Push Token Use Case', () => {
  it('should remove a token owned by the user', async () => {
    await pushTokensRepository.upsert({
      userId: 'user-1',
      token: TOKEN_A,
      platform: 'IOS',
    })

    await sut.execute({ userId: 'user-1', token: TOKEN_A })

    expect(pushTokensRepository.items).toHaveLength(0)
  })

  it('should be idempotent when the token does not exist', async () => {
    await expect(
      sut.execute({ userId: 'user-1', token: TOKEN_A }),
    ).resolves.toBeUndefined()
  })

  it('should not remove a token that belongs to another user', async () => {
    await pushTokensRepository.upsert({
      userId: 'user-2',
      token: TOKEN_B,
      platform: 'ANDROID',
    })

    await sut.execute({ userId: 'user-1', token: TOKEN_B })

    expect(pushTokensRepository.items).toHaveLength(1)
    expect(pushTokensRepository.items[0].userId).toBe('user-2')
  })
})
