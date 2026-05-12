import { isExpoPushToken } from '../../lib/expo-push.js'
import type {
  PushPlatform,
  PushTokenEntity,
  PushTokensRepository,
} from '../repositories/push-tokens-repository.js'
import { InvalidPushTokenError } from './errors/invalid-push-token-error.js'

interface RegisterPushTokenUseCaseRequest {
  userId: string
  token: string
  platform: PushPlatform
  deviceName?: string | null
  deviceId?: string | null
  appVersion?: string | null
}

interface RegisterPushTokenUseCaseResponse {
  pushToken: PushTokenEntity
}

export class RegisterPushTokenUseCase {
  constructor(private pushTokensRepository: PushTokensRepository) {}

  async execute({
    userId,
    token,
    platform,
    deviceName,
    deviceId,
    appVersion,
  }: RegisterPushTokenUseCaseRequest): Promise<RegisterPushTokenUseCaseResponse> {
    if (!isExpoPushToken(token)) {
      throw new InvalidPushTokenError()
    }

    const pushToken = await this.pushTokensRepository.upsert({
      userId,
      token,
      platform,
      deviceName: deviceName ?? null,
      deviceId: deviceId ?? null,
      appVersion: appVersion ?? null,
    })

    return { pushToken }
  }
}
