import type { UsersRepository } from '../repositories/users-repository.js'
import type { VerificationCodeRepository } from '../repositories/verification-code-repository.js'
import { emailService } from '@/lib/email.js'
import { env } from '@/env/index.js'
import {
  generateCodeExpirationDate,
  generateVerificationCode,
} from '@/lib/verification-code.js'
import { passwordResetAttemptLimiter } from '@/lib/attempt-limiter.js'

export const PASSWORD_RESET_CODE_TYPE = 'PASSWORD_RESET'

interface ForgotPasswordUseCaseRequest {
  email: string
}

export class ForgotPasswordUseCase {
  constructor(
    private usersRepository: UsersRepository,
    private verificationCodeRepository: VerificationCodeRepository,
  ) {}

  async execute({ email }: ForgotPasswordUseCaseRequest): Promise<void> {
    const emailNormalized = email.trim().toLowerCase()

    const user = await this.usersRepository.findByEmail(emailNormalized)

    // Enumeração de contas: se o email não existe, encerramos em silêncio.
    // O controller responde 200 com a mesma mensagem genérica nos dois casos.
    if (!user) {
      return
    }

    // Invalida códigos pendentes anteriores — só o último código vale.
    await this.verificationCodeRepository.invalidateByEmailAndType(
      emailNormalized,
      PASSWORD_RESET_CODE_TYPE,
    )

    // Novo código zera o contador de tentativas do email.
    passwordResetAttemptLimiter.reset(emailNormalized)

    const code = generateVerificationCode()
    const expiresAt = generateCodeExpirationDate(15)

    await this.verificationCodeRepository.create({
      code,
      email: emailNormalized,
      userId: user.id,
      type: PASSWORD_RESET_CODE_TYPE,
      expiresAt,
    })

    // Nunca logar o código em produção — apenas conveniência local quando o
    // SMTP não está configurado.
    if (env.NODE_ENV !== 'production') {
      console.log(
        `[dev] Código de reset de senha para ${emailNormalized}: ${code}`,
      )
    }

    try {
      await emailService.sendPasswordResetCodeEmail(
        emailNormalized,
        code,
        user.name,
      )
    } catch (error) {
      // Falha de SMTP não deve vazar a existência da conta nem quebrar a
      // resposta genérica — apenas registramos para diagnóstico.
      console.error('Erro ao enviar email de reset de senha:', error)
    }
  }
}
