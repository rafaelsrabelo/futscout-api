import type { VerificationCodeRepository } from '../repositories/verification-code-repository.js'
import { InvalidVerificationCodeError } from './errors/invalid-verification-code-error.js'
import { TooManyAttemptsError } from './errors/too-many-attempts-error.js'
import { PASSWORD_RESET_CODE_TYPE } from './forgot-password.js'
import {
  passwordResetAttemptLimiter,
  type AttemptLimiter,
} from '@/lib/attempt-limiter.js'

interface VerifyPasswordResetCodeUseCaseRequest {
  email: string
  code: string
}

interface VerifyPasswordResetCodeUseCaseResponse {
  userId: string
  codeId: string
}

export class VerifyPasswordResetCodeUseCase {
  constructor(
    private verificationCodeRepository: VerificationCodeRepository,
    // Injetável para que os testes usem um limitador isolado.
    private attemptLimiter: AttemptLimiter = passwordResetAttemptLimiter,
  ) {}

  async execute({
    email,
    code,
  }: VerifyPasswordResetCodeUseCaseRequest): Promise<VerifyPasswordResetCodeUseCaseResponse> {
    const emailNormalized = email.trim().toLowerCase()

    if (this.attemptLimiter.isBlocked(emailNormalized)) {
      throw new TooManyAttemptsError()
    }

    const verificationCode =
      await this.verificationCodeRepository.findByCodeAndEmail(
        code,
        emailNormalized,
        PASSWORD_RESET_CODE_TYPE,
      )

    if (!verificationCode) {
      const blocked = this.attemptLimiter.registerFailure(emailNormalized)

      // Ao estourar o limite invalidamos os códigos pendentes no banco: mesmo
      // que o contador em memória se perca (restart / outra instância), o
      // código atacado deixa de valer e o usuário precisa pedir outro.
      if (blocked) {
        await this.verificationCodeRepository.invalidateByEmailAndType(
          emailNormalized,
          PASSWORD_RESET_CODE_TYPE,
        )

        throw new TooManyAttemptsError()
      }

      throw new InvalidVerificationCodeError()
    }

    if (!verificationCode.userId) {
      throw new InvalidVerificationCodeError()
    }

    this.attemptLimiter.reset(emailNormalized)

    // O código só é marcado como usado no reset-password — assim um resetToken
    // emitido mas nunca utilizado não deixa o usuário sem caminho de volta.
    return {
      userId: verificationCode.userId,
      codeId: verificationCode.id,
    }
  }
}
