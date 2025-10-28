import type { TokenBlacklist } from 'generated/prisma/client.js'

export interface TokenBlacklistRepository {
  addToBlacklist(
    token: string,
    userId: string,
    expiresAt: Date,
  ): Promise<TokenBlacklist>
  isTokenBlacklisted(token: string): Promise<boolean>
  removeExpiredTokens(): Promise<void>
}
