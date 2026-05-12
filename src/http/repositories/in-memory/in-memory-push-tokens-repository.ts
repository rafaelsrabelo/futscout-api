import { randomUUID } from 'node:crypto'

import type {
  PushTokenEntity,
  PushTokensRepository,
  UpsertPushTokenInput,
} from '../push-tokens-repository.js'

export class InMemoryPushTokensRepository implements PushTokensRepository {
  public items: PushTokenEntity[] = []

  async upsert(data: UpsertPushTokenInput): Promise<PushTokenEntity> {
    const now = new Date()

    // 1) Remove tokens antigos do mesmo deviceId para o mesmo usuário —
    //    evita duplicar envios pro mesmo aparelho quando o token roda.
    if (data.deviceId) {
      this.items = this.items.filter(
        (t) =>
          !(
            t.deviceId === data.deviceId &&
            t.userId === data.userId &&
            t.token !== data.token
          ),
      )
    }

    // 2) Já existe esse token? Atualiza (incluindo possível mudança de userId).
    const idx = this.items.findIndex((t) => t.token === data.token)
    if (idx >= 0) {
      const existing = this.items[idx]
      const updated: PushTokenEntity = {
        ...existing,
        userId: data.userId,
        platform: data.platform,
        deviceName: data.deviceName ?? null,
        deviceId: data.deviceId ?? null,
        appVersion: data.appVersion ?? null,
        lastUsedAt: now,
        updatedAt: now,
      }
      this.items[idx] = updated
      return updated
    }

    // 3) Cria novo.
    const created: PushTokenEntity = {
      id: randomUUID(),
      userId: data.userId,
      token: data.token,
      platform: data.platform,
      deviceName: data.deviceName ?? null,
      deviceId: data.deviceId ?? null,
      appVersion: data.appVersion ?? null,
      lastUsedAt: now,
      createdAt: now,
      updatedAt: now,
    }
    this.items.push(created)
    return created
  }

  async deleteByToken(token: string): Promise<void> {
    this.items = this.items.filter((t) => t.token !== token)
  }

  async deleteManyByTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return
    const set = new Set(tokens)
    this.items = this.items.filter((t) => !set.has(t.token))
  }

  async findManyByUserIds(userIds: string[]): Promise<PushTokenEntity[]> {
    if (userIds.length === 0) return []
    const set = new Set(userIds)
    return this.items.filter((t) => set.has(t.userId))
  }

  async countUsersWithTokens(userIds: string[]): Promise<number> {
    if (userIds.length === 0) return 0
    const set = new Set(userIds)
    const usersWithToken = new Set<string>()
    for (const t of this.items) {
      if (set.has(t.userId)) usersWithToken.add(t.userId)
    }
    return usersWithToken.size
  }
}
