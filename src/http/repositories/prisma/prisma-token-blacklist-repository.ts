import { prisma } from '@/lib/prisma.js'
import type { TokenBlacklistRepository } from '../token-blacklist-repository.js'

export class PrismaTokenBlacklistRepository
  implements TokenBlacklistRepository
{
  async addToBlacklist(token: string, userId: string, expiresAt: Date) {
    const blacklistedToken = await prisma.tokenBlacklist.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    })

    return blacklistedToken
  }

  async isTokenBlacklisted(token: string) {
    const blacklistedToken = await prisma.tokenBlacklist.findUnique({
      where: { token },
    })

    return !!blacklistedToken
  }

  async removeExpiredTokens() {
    await prisma.tokenBlacklist.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    })
  }
}
