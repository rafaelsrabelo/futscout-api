import z from 'zod'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { PrismaUsersRepository } from '../repositories/prisma/prisma-users-repository.js'
import { PrismaRefreshTokenRepository } from '../repositories/prisma/prisma-refresh-token-repository.js'
import { AuthenticateUseCase } from '../use-cases/authenticate.js'
import { InvalidCredentialsError } from '../use-cases/errors/invalid-credentials-error.js'
import { env } from '@/env/index.js'

function normalizeCpf(raw: string): string {
  return raw.replace(/\D/g, '').padStart(11, '0')
}

function resolveCredential(
  input: string,
): { email: string; cpf?: undefined } | { email?: undefined; cpf: string } {
  if (input.includes('@')) return { email: input.trim().toLowerCase() }
  return { cpf: normalizeCpf(input) }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const authenticateBodySchema = z
    .object({
      email: z.string().optional(),
      cpf: z.string().optional(),
      password: z.string().min(6),
    })
    .refine((d) => d.email || d.cpf, {
      message: 'email ou cpf é obrigatório',
      path: ['email'],
    })

  const body = authenticateBodySchema.parse(request.body)
  const credential = body.cpf
    ? { cpf: normalizeCpf(body.cpf) }
    : resolveCredential(body.email!)

  try {
    const usersRepository = new PrismaUsersRepository()
    const refreshTokenRepository = new PrismaRefreshTokenRepository()
    const authenticateUseCase = new AuthenticateUseCase(usersRepository)

    const { user } = await authenticateUseCase.execute({
      ...credential,
      password: body.password,
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
