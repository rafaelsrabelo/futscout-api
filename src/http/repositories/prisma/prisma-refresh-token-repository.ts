import { prisma } from '@/lib/prisma.js'
import type { RefreshTokenRepository } from '../refresh-token-repository.js'
import { randomUUID } from 'node:crypto'

export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  async create(userId: string, expiresAt: Date) {
    const token = randomUUID()

    const refreshToken = await prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    })

    return refreshToken
  }

  async findByToken(token: string) {
    const refreshToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: {
        user: true,
      },
    })

    return refreshToken
  }

  async deleteByToken(token: string) {
    await prisma.refreshToken.delete({
      where: { token },
    })
  }

  async deleteAllByUserId(userId: string) {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    })
  }
}
