import type { UsersRepository } from '../repositories/users-repository.js'
import type { VerificationCodeRepository } from '../repositories/verification-code-repository.js'

interface VerifyEmailUseCaseRequest {
  email: string
  code: string
}

interface VerifyEmailUseCaseResponse {
  success: boolean
  message: string
}

export class VerifyEmailUseCase {
  constructor(
    private usersRepository: UsersRepository,
    private verificationCodeRepository: VerificationCodeRepository,
  ) {}

  async execute({
    email,
    code,
  }: VerifyEmailUseCaseRequest): Promise<VerifyEmailUseCaseResponse> {
    // Buscar código válido — o filtro por type evita que um código de outro
    // fluxo (ex.: PASSWORD_RESET) sirva para ativar a conta.
    const verificationCode =
      await this.verificationCodeRepository.findByCodeAndEmail(
        code,
        email,
        'EMAIL_VERIFICATION',
      )

    if (!verificationCode) {
      return {
        success: false,
        message: 'Código inválido ou expirado',
      }
    }

    // Marcar código como usado
    await this.verificationCodeRepository.markAsUsed(verificationCode.id)

    // Ativar usuário
    if (verificationCode.userId) {
      await this.usersRepository.updateUserActiveStatus(
        verificationCode.userId,
        true,
      )
    }

    // Limpar outros códigos do mesmo email
    await this.verificationCodeRepository.deleteByEmail(email)

    return {
      success: true,
      message: 'Email verificado com sucesso',
    }
  }
}
