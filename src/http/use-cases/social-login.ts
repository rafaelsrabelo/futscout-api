import { randomUUID } from 'node:crypto'
import { hash } from 'bcryptjs'
import type { AuthProvider, User } from 'generated/prisma/client.js'
import type { UsersRepository } from '../repositories/users-repository.js'
import { SocialTokenVerificationError } from './errors/social-token-verification-error.js'

interface SocialLoginUseCaseRequest {
  provider: AuthProvider
  providerId: string
  email?: string | null
  name?: string | null
}

interface SocialLoginUseCaseResponse {
  user: User
}

export class SocialLoginUseCase {
  constructor(private usersRepository: UsersRepository) {}

  async execute({
    provider,
    providerId,
    email,
    name,
  }: SocialLoginUseCaseRequest): Promise<SocialLoginUseCaseResponse> {
    // Primeiro verifica por provider, depois por email
    // Isso garante que se o usuário já existe com o mesmo email,
    // ele será encontrado e atualizado em vez de tentar criar duplicado
    let user =
      (await this.usersRepository.findByProvider(provider, providerId)) ??
      (email ? await this.usersRepository.findByEmail(email) : null)

    if (!user) {
      if (!email) {
        throw new SocialTokenVerificationError(
          'Não foi possível obter o e-mail do usuário pelo provedor.',
        )
      }

      // Verifica novamente por email antes de criar (proteção contra condição de corrida)
      user = await this.usersRepository.findByEmail(email)

      if (!user) {
        const passwordHash = await hash(randomUUID(), 6)

        const defaultName =
          name ??
          (provider === 'GOOGLE'
            ? 'Usuário Google'
            : provider === 'APPLE'
              ? 'Usuário Apple'
              : 'Usuário')

        try {
          user = await this.usersRepository.create({
            email,
            name: defaultName,
            password: passwordHash,
            role: null,
            isActive: true,
            provider,
            providerId,
            emailVerified: true,
          })
        } catch (error: unknown) {
          // Se falhar por constraint de email único (condição de corrida),
          // busca o usuário novamente e atualiza
          if (
            error &&
            typeof error === 'object' &&
            'code' in error &&
            error.code === 'P2002' &&
            'meta' in error &&
            error.meta &&
            typeof error.meta === 'object' &&
            'target' in error.meta &&
            Array.isArray(error.meta.target) &&
            error.meta.target.includes('email')
          ) {
            user = await this.usersRepository.findByEmail(email)
            if (!user) {
              throw error // Se ainda não encontrar, relança o erro original
            }
            // Se encontrou, continua para o bloco de atualização abaixo
          } else {
            throw error // Relança outros erros
          }
        }
      }
    }

    // Se o usuário existe (foi encontrado ou criado), atualiza se necessário
    if (user) {
      const updates: Partial<User> = {}

      if (!user.providerId || user.provider !== provider) {
        updates.provider = provider
        updates.providerId = providerId
      }

      if (!user.emailVerified) {
        updates.emailVerified = true
      }

      if (!user.isActive) {
        updates.isActive = true
      }

      // Garantir que o usuário sempre tenha um nome válido
      const defaultName =
        name ??
        (provider === 'GOOGLE'
          ? 'Usuário Google'
          : provider === 'APPLE'
            ? 'Usuário Apple'
            : 'Usuário')

      // Atualiza o nome se:
      // 1. O usuário não tem nome válido (vazio ou genérico)
      // 2. O nome fornecido é diferente e mais específico
      const isGenericName =
        !user.name ||
        user.name === 'Usuário' ||
        user.name === 'Usuário Google' ||
        user.name === 'Usuário Apple'

      if (isGenericName || (name && user.name !== name)) {
        updates.name = defaultName
      }

      if (Object.keys(updates).length > 0) {
        user = await this.usersRepository.update(user.id, updates)
      }
    }

    return { user }
  }
}
