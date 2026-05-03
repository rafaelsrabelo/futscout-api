import { hash } from 'bcryptjs'

import type { AthleteProfileRepository } from '../../repositories/athlete-profile-repository.js'
import type { RefreshTokenRepository } from '../../repositories/refresh-token-repository.js'
import type { UsersRepository } from '../../repositories/users-repository.js'

import { AthleteNotFoundError } from './errors/athlete-not-found-error.js'

export interface ResetAthletePasswordAdminUseCaseRequest {
  athleteProfileId: string
  newPassword: string
}

export class ResetAthletePasswordAdminUseCase {
  constructor(
    private athleteProfileRepository: AthleteProfileRepository,
    private usersRepository: UsersRepository,
    private refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async execute({
    athleteProfileId,
    newPassword,
  }: ResetAthletePasswordAdminUseCaseRequest): Promise<void> {
    const profile =
      await this.athleteProfileRepository.findById(athleteProfileId)
    if (!profile) throw new AthleteNotFoundError()

    const hashed = await hash(newPassword, 6)

    await this.usersRepository.update(profile.userId, { password: hashed })

    // Força re-login em qualquer dispositivo conectado.
    await this.refreshTokenRepository.deleteAllByUserId(profile.userId)
  }
}

export { AthleteNotFoundError }
