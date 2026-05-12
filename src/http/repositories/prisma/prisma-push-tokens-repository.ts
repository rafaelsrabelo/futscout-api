import { prisma } from '@/lib/prisma.js'

import type {
  PushTokenEntity,
  PushTokensRepository,
  UpsertPushTokenInput,
} from '../push-tokens-repository.js'

export class PrismaPushTokensRepository implements PushTokensRepository {
  async upsert(data: UpsertPushTokenInput): Promise<PushTokenEntity> {
    // 1) Remove tokens antigos do mesmo deviceId+userId pra evitar 2 envios pro
    //    mesmo aparelho quando o Expo rotaciona o token.
    if (data.deviceId) {
      await prisma.pushToken.deleteMany({
        where: {
          userId: data.userId,
          deviceId: data.deviceId,
          NOT: { token: data.token },
        },
      })
    }

    // 2) Upsert por token único — se já existir atrelado a outro userId,
    //    é reatribuído (caso de troca de conta no mesmo device).
    const now = new Date()
    const row = await prisma.pushToken.upsert({
      where: { token: data.token },
      create: {
        userId: data.userId,
        token: data.token,
        platform: data.platform,
        deviceName: data.deviceName ?? null,
        deviceId: data.deviceId ?? null,
        appVersion: data.appVersion ?? null,
        lastUsedAt: now,
      },
      update: {
        userId: data.userId,
        platform: data.platform,
        deviceName: data.deviceName ?? null,
        deviceId: data.deviceId ?? null,
        appVersion: data.appVersion ?? null,
        lastUsedAt: now,
      },
    })

    return row as PushTokenEntity
  }

  async deleteByToken(token: string): Promise<void> {
    await prisma.pushToken.deleteMany({ where: { token } })
  }

  async deleteManyByTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return
    await prisma.pushToken.deleteMany({ where: { token: { in: tokens } } })
  }

  async findManyByUserIds(userIds: string[]): Promise<PushTokenEntity[]> {
    if (userIds.length === 0) return []
    const rows = await prisma.pushToken.findMany({
      where: { userId: { in: userIds } },
    })
    return rows as PushTokenEntity[]
  }

  async countUsersWithTokens(userIds: string[]): Promise<number> {
    if (userIds.length === 0) return 0
    const grouped = await prisma.pushToken.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds } },
    })
    return grouped.length
  }
}
