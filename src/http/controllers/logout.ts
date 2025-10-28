import type { FastifyReply, FastifyRequest } from 'fastify'
import { PrismaRefreshTokenRepository } from '../repositories/prisma/prisma-refresh-token-repository.js'
import { PrismaTokenBlacklistRepository } from '../repositories/prisma/prisma-token-blacklist-repository.js'

export async function logout(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user.sub

  // Opcional: aceitar refresh token específico no body
  const body = request.body as { refreshToken?: string }
  const specificRefreshToken = body?.refreshToken

  try {
    const refreshTokenRepository = new PrismaRefreshTokenRepository()
    const tokenBlacklistRepository = new PrismaTokenBlacklistRepository()

    // Adicionar o access token atual à blacklist
    const authHeader = request.headers.authorization
    if (authHeader) {
      const accessToken = authHeader.replace('Bearer ', '')
      // Calculamos a expiração do token baseado no tempo configurado (15 minutos)
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutos
      await tokenBlacklistRepository.addToBlacklist(
        accessToken,
        userId,
        expiresAt,
      )
    }

    if (specificRefreshToken) {
      // Logout de sessão específica
      const storedRefreshToken =
        await refreshTokenRepository.findByToken(specificRefreshToken)

      if (!storedRefreshToken || storedRefreshToken.userId !== userId) {
        return reply.status(401).send({ message: 'Invalid refresh token' })
      }

      await refreshTokenRepository.deleteByToken(specificRefreshToken)
    } else {
      // Se não enviou refresh token, deleta o mais recente (sessão atual)
      await refreshTokenRepository.deleteAllByUserId(userId)
    }

    return reply.status(200).send({ message: 'Logged out successfully' })
  } catch (error) {
    return reply.status(500).send({ message: 'Internal server error' })
  }
}

// Logout from all devices
export async function logoutAll(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user.sub

  try {
    const refreshTokenRepository = new PrismaRefreshTokenRepository()
    const tokenBlacklistRepository = new PrismaTokenBlacklistRepository()

    // Adicionar o access token atual à blacklist
    const authHeader = request.headers.authorization
    if (authHeader) {
      const accessToken = authHeader.replace('Bearer ', '')
      // Calculamos a expiração do token baseado no tempo configurado (15 minutos)
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutos
      await tokenBlacklistRepository.addToBlacklist(
        accessToken,
        userId,
        expiresAt,
      )
    }

    // Delete all refresh tokens for this user
    await refreshTokenRepository.deleteAllByUserId(userId)

    return reply
      .status(200)
      .send({ message: 'Logged out from all devices successfully' })
  } catch (error) {
    return reply.status(500).send({ message: 'Internal server error' })
  }
}
