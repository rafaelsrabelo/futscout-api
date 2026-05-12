import type { AthleteProfileRepository } from '../../repositories/athlete-profile-repository.js'
import type { NotificationAudiencePayload } from '../../repositories/notification-logs-repository.js'
import type { PushTokensRepository } from '../../repositories/push-tokens-repository.js'
import type { UsersRepository } from '../../repositories/users-repository.js'
import { resolveNotificationAudience } from './resolve-notification-audience.js'

export interface PreviewNotificationAudienceRequest {
  audience: NotificationAudiencePayload
}

export interface PreviewNotificationAudienceResponse {
  totalRecipients: number
  totalWithPushToken: number
}

export class PreviewNotificationAudienceUseCase {
  constructor(
    private deps: {
      usersRepository: UsersRepository
      athleteProfileRepository: AthleteProfileRepository
      pushTokensRepository: PushTokensRepository
    },
  ) {}

  async execute({
    audience,
  }: PreviewNotificationAudienceRequest): Promise<PreviewNotificationAudienceResponse> {
    const { userIds } = await resolveNotificationAudience(audience, {
      usersRepository: this.deps.usersRepository,
      athleteProfileRepository: this.deps.athleteProfileRepository,
    })

    const totalWithPushToken =
      await this.deps.pushTokensRepository.countUsersWithTokens(userIds)

    return {
      totalRecipients: userIds.length,
      totalWithPushToken,
    }
  }
}
