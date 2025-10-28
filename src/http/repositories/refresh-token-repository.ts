import type { RefreshToken } from 'generated/prisma/client.js'

export interface RefreshTokenRepository {
  create(userId: string, expiresAt: Date): Promise<RefreshToken>
  findByToken(token: string): Promise<RefreshToken | null>
  deleteByToken(token: string): Promise<void>
  deleteAllByUserId(userId: string): Promise<void>
}
