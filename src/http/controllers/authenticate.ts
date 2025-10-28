import z from 'zod'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { PrismaUsersRepository } from '../repositories/prisma/prisma-users-repository.js'
import { PrismaRefreshTokenRepository } from '../repositories/prisma/prisma-refresh-token-repository.js'
import { AuthenticateUseCase } from '../use-cases/authenticate.js'
import { InvalidCredentialsError } from '../use-cases/errors/invalid-credentials-error.js'
import { env } from '@/env/index.js'

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const authenticateBodySchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  })
  const { email, password } = authenticateBodySchema.parse(request.body)

  try {
    const usersRepository = new PrismaUsersRepository()
    const refreshTokenRepository = new PrismaRefreshTokenRepository()
    const authenticateUseCase = new AuthenticateUseCase(usersRepository)

    const { user } = await authenticateUseCase.execute({
      email,
      password,
    })

    // Generate access token (short-lived)
    const accessToken = await reply.jwtSign(
      { role: user.role },
      {
        sub: user.id,
        expiresIn: env.JWT_EXPIRES_IN,
      },
    )

    // Generate refresh token (long-lived)
    const refreshTokenExpiresAt = new Date()
    refreshTokenExpiresAt.setDate(
      refreshTokenExpiresAt.getDate() + env.REFRESH_TOKEN_EXPIRES_IN_DAYS,
    )

    const refreshToken = await refreshTokenRepository.create(
      user.id,
      refreshTokenExpiresAt,
    )

    return reply.status(200).send({
      accessToken,
      refreshToken: refreshToken.token,
      expiresIn: env.JWT_EXPIRES_IN,
    })
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return reply.status(401).send({ message: error.message })
    }

    throw error
  }
}
