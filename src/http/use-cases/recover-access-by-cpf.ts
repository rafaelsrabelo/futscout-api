import { hash } from 'bcryptjs'
import type { AthleteProfileRepository } from '../repositories/athlete-profile-repository.js'
import type { UsersRepository } from '../repositories/users-repository.js'
import { EmailAlreadyExistsError } from './errors/email-already-exists-error.js'
import { RecoveryValidationError } from './errors/recovery-validation-error.js'
import { emailService } from '@/lib/email.js'

interface RecoverAccessByCpfRequest {
  email: string
  cpf: string
  birthDate: string
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  )
}

function generateTempPassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return out
}

export class RecoverAccessByCpfUseCase {
  constructor(
    private usersRepository: UsersRepository,
    private athleteProfileRepository: AthleteProfileRepository,
  ) {}

  async execute({
    email,
    cpf,
    birthDate,
  }: RecoverAccessByCpfRequest): Promise<void> {
    const user = await this.usersRepository.findByCpf(cpf)
    if (!user) {
      throw new RecoveryValidationError()
    }

    const athleteProfile = await this.athleteProfileRepository.findByUserId(
      user.id,
    )

    // Sem birthDate no DB, não há como validar identidade — recusa por segurança.
    if (!athleteProfile || !athleteProfile.birthDate) {
      throw new RecoveryValidationError()
    }

    const provided = new Date(birthDate)
    if (
      isNaN(provided.getTime()) ||
      !isSameDay(athleteProfile.birthDate, provided)
    ) {
      throw new RecoveryValidationError()
    }

    const normalizedEmail = email.trim().toLowerCase()

    if (normalizedEmail !== user.email) {
      const existing = await this.usersRepository.findByEmail(normalizedEmail)
      if (existing && existing.id !== user.id) {
        throw new EmailAlreadyExistsError()
      }
    }

    const tempPassword = generateTempPassword()
    const password_hash = await hash(tempPassword, 6)

    await this.usersRepository.update(user.id, {
      email: normalizedEmail,
      password: password_hash,
      emailVerified: true,
      isActive: true,
    })

    await emailService.sendPasswordRecoveryEmail(
      normalizedEmail,
      tempPassword,
      user.name,
    )
  }
}
