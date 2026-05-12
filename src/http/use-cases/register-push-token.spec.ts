import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryPushTokensRepository } from '../repositories/in-memory/in-memory-push-tokens-repository.js'
import { InvalidPushTokenError } from './errors/invalid-push-token-error.js'
import { RegisterPushTokenUseCase } from './register-push-token.js'

const VALID_TOKEN_A = 'ExponentPushToken[aaaaaaaaaaaaaaaaaa]'
const VALID_TOKEN_B = 'ExponentPushToken[bbbbbbbbbbbbbbbbbb]'

let pushTokensRepository: InMemoryPushTokensRepository
let sut: RegisterPushTokenUseCase

beforeEach(() => {
  pushTokensRepository = new InMemoryPushTokensRepository()
  sut = new RegisterPushTokenUseCase(pushTokensRepository)
})

describe('Register Push Token Use Case', () => {
  it('should register a new push token', async () => {
    const { pushToken } = await sut.execute({
      userId: 'user-1',
      token: VALID_TOKEN_A,
      platform: 'IOS',
      deviceName: 'iPhone de Rafael',
    })

    expect(pushToken.id).toEqual(expect.any(String))
    expect(pushTokensRepository.items).toHaveLength(1)
    expect(pushTokensRepository.items[0].token).toBe(VALID_TOKEN_A)
    expect(pushTokensRepository.items[0].userId).toBe('user-1')
  })

  it('should reject malformed Expo tokens', async () => {
    await expect(() =>
      sut.execute({
        userId: 'user-1',
        token: 'not-an-expo-token',
        platform: 'IOS',
      }),
    ).rejects.toBeInstanceOf(InvalidPushTokenError)
    expect(pushTokensRepository.items).toHaveLength(0)
  })

  it('should reattach an existing token to the new userId on re-register', async () => {
    await sut.execute({
      userId: 'user-1',
      token: VALID_TOKEN_A,
      platform: 'IOS',
    })

    // Mesmo token registrado por outro usuário (ex.: troca de conta no device)
    await sut.execute({
      userId: 'user-2',
      token: VALID_TOKEN_A,
      platform: 'IOS',
    })

    expect(pushTokensRepository.items).toHaveLength(1)
    expect(pushTokensRepository.items[0].userId).toBe('user-2')
  })

  it('should remove previous tokens with same deviceId+userId when registering a new one', async () => {
    await sut.execute({
      userId: 'user-1',
      token: VALID_TOKEN_A,
      platform: 'IOS',
      deviceId: 'device-xyz',
    })

    await sut.execute({
      userId: 'user-1',
      token: VALID_TOKEN_B,
      platform: 'IOS',
      deviceId: 'device-xyz',
    })

    expect(pushTokensRepository.items).toHaveLength(1)
    expect(pushTokensRepository.items[0].token).toBe(VALID_TOKEN_B)
  })
})
