import { randomUUID } from 'node:crypto';
import { hash } from 'bcryptjs';
import type { AuthProvider, User } from 'generated/prisma/client.js';
import type { UsersRepository } from '../repositories/users-repository.js';
import { SocialTokenVerificationError } from './errors/social-token-verification-error.js';

interface SocialLoginUseCaseRequest {
  provider: AuthProvider;
  providerId: string;
  email?: string | null;
  name?: string | null;
}

interface SocialLoginUseCaseResponse {
  user: User;
}

export class SocialLoginUseCase {
  constructor(private usersRepository: UsersRepository) {}

  async execute({
    provider,
    providerId,
    email,
    name,
  }: SocialLoginUseCaseRequest): Promise<SocialLoginUseCaseResponse> {
    let user =
      (await this.usersRepository.findByProvider(provider, providerId)) ??
      (email ? await this.usersRepository.findByEmail(email) : null);

    if (!user) {
      if (!email) {
        throw new SocialTokenVerificationError(
          'Não foi possível obter o e-mail do usuário pelo provedor.'
        );
      }

      const passwordHash = await hash(randomUUID(), 6);

      user = await this.usersRepository.create({
        email,
        name: name ?? email.split('@')[0],
        password: passwordHash,
        role: null,
        isActive: true,
        provider,
        providerId,
        emailVerified: true,
      });
    } else {
      const updates: Partial<User> = {};

      if (!user.providerId || user.provider !== provider) {
        updates.provider = provider;
        updates.providerId = providerId;
      }

      if (!user.emailVerified) {
        updates.emailVerified = true;
      }

      if (!user.isActive) {
        updates.isActive = true;
      }

      if (name && user.name !== name) {
        updates.name = name;
      }

      if (Object.keys(updates).length > 0) {
        user = await this.usersRepository.update(user.id, updates);
      }
    }

    return { user };
  }
}
