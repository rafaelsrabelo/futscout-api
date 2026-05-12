export type PushPlatform = 'IOS' | 'ANDROID'

export interface PushTokenEntity {
  id: string
  userId: string
  token: string
  platform: PushPlatform
  deviceName: string | null
  deviceId: string | null
  appVersion: string | null
  lastUsedAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface UpsertPushTokenInput {
  userId: string
  token: string
  platform: PushPlatform
  deviceName?: string | null
  deviceId?: string | null
  appVersion?: string | null
}

export interface PushTokensRepository {
  // Upsert por `token`. Se já existir e estiver atrelado a outro userId, reatribui.
  // Quando `deviceId` é informado, remove tokens anteriores do mesmo deviceId/userId
  // pra evitar 2 envios pro mesmo aparelho.
  upsert(data: UpsertPushTokenInput): Promise<PushTokenEntity>

  // Remove pelo valor do token. Usado no logout. Idempotente.
  deleteByToken(token: string): Promise<void>

  // Remove vários (ex.: tokens com DeviceNotRegistered retornados pela Expo).
  deleteManyByTokens(tokens: string[]): Promise<void>

  // Retorna tokens dos userIds fornecidos. Usado pelo envio admin.
  findManyByUserIds(userIds: string[]): Promise<PushTokenEntity[]>

  // Conta quantos userIds, dentre os passados, possuem ≥1 PushToken.
  // Usado pelo preview de audiência.
  countUsersWithTokens(userIds: string[]): Promise<number>
}
