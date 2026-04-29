import { hash } from 'bcryptjs'
import { normalizeCpf, validateCpf } from '../../utils/validateCpf.js'
import type { UsersRepository } from '../repositories/users-repository.js'
import type { VerificationCodeRepository } from '../repositories/verification-code-repository.js'
import { CpfAlreadyExistsError } from './errors/cpf-already-exists-error.js'
import { EmailAlreadyExistsError } from './errors/email-already-exists-error.js'
import { InvalidCpfError } from './errors/invalid-cpf-error.js'
import type {
  RegisterUseCaseRequest,
  RegisterUseCaseResponse,
} from './types.js'
import { emailService } from '@/lib/email.js'
import {
  generateCodeExpirationDate,
  generateVerificationCode,
} from '@/lib/verification-code.js'

export class RegisterUseCase {
  constructor(
    private usersRepository: UsersRepository,
    private verificationCodeRepository: VerificationCodeRepository,
  ) {}

  async execute({
    name,
    email,
    password,
    cpf,
    role,
  }: RegisterUseCaseRequest): Promise<RegisterUseCaseResponse> {
    if (!validateCpf(cpf)) {
      throw new InvalidCpfError()
    }
    const cpfNormalized = normalizeCpf(cpf)
    const emailNormalized = email.trim().toLowerCase()
    const password_hash = await hash(password, 6)

    const userByCpf = await this.usersRepository.findByCpf(cpfNormalized)

    // Reativação: cadastro importado via script reivindicado pelo dono real.
    // Substitui email placeholder + senha temporária pelos dados informados
    // e desliga a flag isImported (consumida).
    if (userByCpf && userByCpf.isImported) {
      if (emailNormalized !== userByCpf.email) {
        const userByEmail =
          await this.usersRepository.findByEmail(emailNormalized)
        if (userByEmail && userByEmail.id !== userByCpf.id) {
          throw new EmailAlreadyExistsError()
        }
      }

      const updated = await this.usersRepository.update(userByCpf.id, {
        name,
        email: emailNormalized,
        password: password_hash,
        isImported: false,
        emailVerified: false,
        isActive: false,
        ...(role && { role }),
      })

      const verificationCode = generateVerificationCode()
      const expiresAt = generateCodeExpirationDate(15)
      await this.verificationCodeRepository.create({
        code: verificationCode,
        email: emailNormalized,
        userId: updated.id,
        type: 'EMAIL_VERIFICATION',
        expiresAt,
      })

      try {
        await emailService.sendVerificationEmail(
          emailNormalized,
          verificationCode,
          name,
        )
      } catch (error) {
        console.error('Failed to send verification email:', error)
      }

      return { user: updated, reactivated: true }
    }

    if (userByCpf) {
      throw new CpfAlreadyExistsError()
    }

    const userByEmail = await this.usersRepository.findByEmail(emailNormalized)
    if (userByEmail) {
      throw new EmailAlreadyExistsError()
    }

    const user = await this.usersRepository.create({
      name,
      email: emailNormalized,
      cpf: cpfNormalized,
      password: password_hash,
      role,
      isActive: false,
      isImported: false,
    })

    const verificationCode = generateVerificationCode()
    const expiresAt = generateCodeExpirationDate(15)
    await this.verificationCodeRepository.create({
      code: verificationCode,
      email: emailNormalized,
      userId: user.id,
      type: 'EMAIL_VERIFICATION',
      expiresAt,
    })

    try {
      await emailService.sendVerificationEmail(
        emailNormalized,
        verificationCode,
        name,
      )
    } catch (error) {
      console.error('Failed to send verification email:', error)
    }

    return { user, reactivated: false }
  }
}
