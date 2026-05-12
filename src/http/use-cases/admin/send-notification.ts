import {
  sendExpoPushNotifications,
  type ExpoPushMessage,
  type ExpoPushSender,
} from '../../../lib/expo-push.js'
import type { AthleteProfileRepository } from '../../repositories/athlete-profile-repository.js'
import type {
  NotificationAudiencePayload,
  NotificationLogEntity,
  NotificationLogsRepository,
} from '../../repositories/notification-logs-repository.js'
import type { PushTokensRepository } from '../../repositories/push-tokens-repository.js'
import type { UsersRepository } from '../../repositories/users-repository.js'
import { resolveNotificationAudience } from './resolve-notification-audience.js'

export interface SendNotificationAdminRequest {
  title: string
  body: string
  data?: Record<string, unknown>
  audience: NotificationAudiencePayload
  sound?: 'default' | null
  badge?: number
  // userId do admin que está disparando (auth).
  sentByUserId: string
}

export interface SendNotificationAdminResponse {
  log: NotificationLogEntity
  totalRecipients: number
  totalWithToken: number
  successCount: number
  failureCount: number
  invalidTokensRemoved: number
}

export class SendNotificationAdminUseCase {
  constructor(
    private deps: {
      usersRepository: UsersRepository
      athleteProfileRepository: AthleteProfileRepository
      pushTokensRepository: PushTokensRepository
      notificationLogsRepository: NotificationLogsRepository
      // Sender injetável — em testes recebe um fake; em produção usa o default.
      expoSender?: ExpoPushSender
    },
  ) {}

  async execute(
    req: SendNotificationAdminRequest,
  ): Promise<SendNotificationAdminResponse> {
    const { userIds } = await resolveNotificationAudience(req.audience, {
      usersRepository: this.deps.usersRepository,
      athleteProfileRepository: this.deps.athleteProfileRepository,
    })

    const tokens =
      await this.deps.pushTokensRepository.findManyByUserIds(userIds)

    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.token,
      title: req.title,
      body: req.body,
      data: req.data ?? {},
      sound: req.sound === null ? null : (req.sound ?? 'default'),
      ...(req.badge !== undefined ? { badge: req.badge } : {}),
      channelId: 'default',
    }))

    const sendResult = await sendExpoPushNotifications(
      messages,
      this.deps.expoSender,
    )

    if (sendResult.invalidTokens.length > 0) {
      await this.deps.pushTokensRepository.deleteManyByTokens(
        sendResult.invalidTokens,
      )
    }

    // Conta usuários únicos com pelo menos um token (denominador real de envio).
    const usersWithTokens = new Set(tokens.map((t) => t.userId)).size

    const log = await this.deps.notificationLogsRepository.create({
      title: req.title,
      body: req.body,
      data: req.data ?? null,
      audienceType: req.audience.type,
      audiencePayload: req.audience,
      sentByUserId: req.sentByUserId,
      totalRecipients: userIds.length,
      totalWithToken: usersWithTokens,
      successCount: sendResult.successCount,
      failureCount: sendResult.failureCount,
      invalidTokensCnt: sendResult.invalidTokens.length,
    })

    return {
      log,
      totalRecipients: userIds.length,
      totalWithToken: usersWithTokens,
      successCount: sendResult.successCount,
      failureCount: sendResult.failureCount,
      invalidTokensRemoved: sendResult.invalidTokens.length,
    }
  }
}
