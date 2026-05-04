import { hash } from 'bcryptjs'

import type { RefreshTokenRepository } from '../../repositories/refresh-token-repository.js'
import type { UsersRepository } from '../../repositories/users-repository.js'

import { UserNotFoundError } from './errors/user-not-found-error.js'

export interface ResetUserPasswordAdminUseCaseRequest {
  userId: string
  newPassword: string
}

export class ResetUserPasswordAdminUseCase {
  constructor(
    private usersRepository: UsersRepository,
    private refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async execute({
    userId,
    newPassword,
  }: ResetUserPasswordAdminUseCaseRequest): Promise<void> {
    const user = await this.usersRepository.findById(userId)
    if (!user) throw new UserNotFoundError()

    const hashed = await hash(newPassword, 6)
    await this.usersRepository.update(userId, { password: hashed })
    // Força re-login em qualquer dispositivo conectado.
    await this.refreshTokenRepository.deleteAllByUserId(userId)
  }
}
