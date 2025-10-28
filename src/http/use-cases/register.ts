import { hash } from 'bcryptjs'
import type { UsersRepository } from '../repositories/users-repository.js'
import type { VerificationCodeRepository } from '../repositories/verification-code-repository.js'
import { EmailAlreadyExistsError } from './errors/email-already-exists-error.js'
import type {
  RegisterUseCaseRequest,
  RegisterUseCaseResponse,
} from './types.js'
import { emailService } from '@/lib/email.js'
import {
  generateVerificationCode,
  generateCodeExpirationDate,
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
    role,
  }: RegisterUseCaseRequest): Promise<RegisterUseCaseResponse> {
    const password_hash = await hash(password, 6)

    const userWithSameEmail = await this.usersRepository.findByEmail(email)

    if (userWithSameEmail) {
      throw new EmailAlreadyExistsError()
    }

    // Criar usuário como inativo
    const user = await this.usersRepository.create({
      name,
      email,
      password: password_hash,
      role: role || 'ATHLETE',
      isActive: false, // Usuário começa inativo até verificar email
    })

    // Gerar código de verificação
    const verificationCode = generateVerificationCode()
    const expiresAt = generateCodeExpirationDate(15) // 15 minutos

    // Salvar código no banco
    await this.verificationCodeRepository.create({
      code: verificationCode,
      email,
      userId: user.id,
      type: 'EMAIL_VERIFICATION',
      expiresAt,
    })

    // Enviar email com código
    try {
      await emailService.sendVerificationEmail(email, verificationCode, name)
    } catch (error) {
      console.error('Failed to send verification email:', error)
      // Não falha o registro se o email não for enviado
      // Pode implementar retry logic aqui
    }

    return {
      user,
    }
  }
}
