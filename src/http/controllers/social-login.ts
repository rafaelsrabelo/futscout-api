import { env } from '@/env/index.js';
import { verifyAppleIdToken, verifyGoogleIdToken } from '@/lib/social-auth.js';
import type { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod';
import { PrismaRefreshTokenRepository } from '../repositories/prisma/prisma-refresh-token-repository.js';
import { PrismaUsersRepository } from '../repositories/prisma/prisma-users-repository.js';
import { SocialTokenVerificationError } from '../use-cases/errors/social-token-verification-error.js';
import { SocialLoginUseCase } from '../use-cases/social-login.js';

const providerMap = {
  google: 'GOOGLE',
  apple: 'APPLE',
} as const;

const socialLoginBodySchema = z.object({
  provider: z.enum(['google', 'apple']),
  idToken: z.string().min(10),
  accessToken: z.string().optional(),
  authorizationCode: z.string().optional(),
  user: z.string().optional(),
  email: z.string().email().optional(),
  fullName: z.string().optional(),
});

export async function socialLogin(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const {
    provider: providerRaw,
    idToken,
    user,
    email,
    fullName,
  } = socialLoginBodySchema.parse(request.body);

  const provider = providerMap[providerRaw];

  try {
    const providerProfile =
      provider === 'GOOGLE'
        ? await verifyGoogleIdToken(idToken)
        : await verifyAppleIdToken(idToken);

    const providerId = providerProfile.providerId ?? user;

    if (!providerId) {
      throw new SocialTokenVerificationError(
        'Não foi possível identificar o usuário informado pelo provedor.'
      );
    }

    const resolvedEmail = providerProfile.email ?? email;
    const resolvedName =
      fullName ??
      providerProfile.name ??
      (provider === 'GOOGLE' ? 'Usuário Google' : 'Usuário Apple');

    const usersRepository = new PrismaUsersRepository();
    const socialLoginUseCase = new SocialLoginUseCase(usersRepository);

    const { user: dbUser } = await socialLoginUseCase.execute({
      provider,
      providerId,
      email: resolvedEmail,
      name: resolvedName,
    });

    const refreshTokenRepository = new PrismaRefreshTokenRepository();
    const refreshTokenExpiresAt = new Date();
    refreshTokenExpiresAt.setDate(
      refreshTokenExpiresAt.getDate() + env.REFRESH_TOKEN_EXPIRES_IN_DAYS
    );

    const refreshToken = await refreshTokenRepository.create(
      dbUser.id,
      refreshTokenExpiresAt
    );

    const accessToken = await reply.jwtSign(
      { role: dbUser.role },
      {
        sub: dbUser.id,
        expiresIn: env.JWT_EXPIRES_IN,
      }
    );

    return reply.status(200).send({
      accessToken,
      refreshToken: refreshToken.token,
      expiresIn: env.JWT_EXPIRES_IN,
    });
  } catch (error) {
    if (error instanceof SocialTokenVerificationError) {
      return reply.status(401).send({ message: error.message });
    }

    throw error;
  }
}
