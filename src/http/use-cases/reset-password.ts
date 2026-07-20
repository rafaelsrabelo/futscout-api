import { hash } from 'bcryptjs'
import type { UsersRepository } from '../repositories/users-repository.js'
import type { VerificationCodeRepository } from '../repositories/verification-code-repository.js'
import { InvalidResetTokenError } from './errors/invalid-reset-token-error.js'
import { PASSWORD_RESET_CODE_TYPE } from './forgot-password.js'

interface ResetPasswordUseCaseRequest {
  // Extraídos do resetToken já verificado pelo controller.
  userId: string
  codeId: string
  password: string
}

export class ResetPasswordUseCase {
  constructor(
    private usersRepository: UsersRepository,
    private verificationCodeRepository: VerificationCodeRepository,
  ) {}

  async execute({
    userId,
    codeId,
    password,
  }: ResetPasswordUseCaseRequest): Promise<void> {
    const verificationCode =
      await this.verificationCodeRepository.findById(codeId)

    // Revalidamos o código no banco: o resetToken sozinho não basta, ele
    // precisa apontar para um código PASSWORD_RESET ainda não consumido e
    // pertencente ao mesmo usuário. Isso torna o token de uso único.
    if (
      !verificationCode ||
      verificationCode.type !== PASSWORD_RESET_CODE_TYPE ||
      verificationCode.usedAt !== null ||
      verificationCode.userId !== userId
    ) {
      throw new InvalidResetTokenError()
    }

    const user = await this.usersRepository.findById(userId)

    if (!user) {
      throw new InvalidResetTokenError()
    }

    // Mesmo custo de hash usado no register/recover-access.
    const password_hash = await hash(password, 6)

    await this.usersRepository.update(userId, { password: password_hash })

    await this.verificationCodeRepository.markAsUsed(codeId)
  }
}
