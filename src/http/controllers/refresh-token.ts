import z from 'zod'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { PrismaUsersRepository } from '../repositories/prisma/prisma-users-repository.js'
import { PrismaRefreshTokenRepository } from '../repositories/prisma/prisma-refresh-token-repository.js'
import { env } from '@/env/index.js'

export async function refreshToken(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const refreshTokenBodySchema = z.object({
    refreshToken: z.string(),
  })

  const { refreshToken } = refreshTokenBodySchema.parse(request.body)

  try {
    const refreshTokenRepository = new PrismaRefreshTokenRepository()
    const usersRepository = new PrismaUsersRepository()

    // Find refresh token in database
    const storedRefreshToken =
      await refreshTokenRepository.findByToken(refreshToken)

    if (!storedRefreshToken) {
      return reply.status(401).send({ message: 'Invalid refresh token' })
    }

    // Check if refresh token is expired
    if (storedRefreshToken.expiresAt < new Date()) {
      await refreshTokenRepository.deleteByToken(refreshToken)
      return reply.status(401).send({ message: 'Refresh token expired' })
    }

    // Get user
    const user = await usersRepository.findById(storedRefreshToken.userId)
    if (!user) {
      return reply.status(401).send({ message: 'User not found' })
    }

    // Generate new access token
    const newAccessToken = await reply.jwtSign(
      { role: user.role },
      {
        sub: user.id,
        expiresIn: env.JWT_EXPIRES_IN,
      },
    )

    // Optionally generate new refresh token (refresh token rotation)
    await refreshTokenRepository.deleteByToken(refreshToken)

    const newRefreshTokenExpiresAt = new Date()
    newRefreshTokenExpiresAt.setDate(
      newRefreshTokenExpiresAt.getDate() + env.REFRESH_TOKEN_EXPIRES_IN_DAYS,
    )

    const newRefreshToken = await refreshTokenRepository.create(
      user.id,
      newRefreshTokenExpiresAt,
    )

    return reply.status(200).send({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken.token,
      expiresIn: env.JWT_EXPIRES_IN,
    })
  } catch (error) {
    return reply.status(500).send({ message: 'Internal server error' })
  }
}
