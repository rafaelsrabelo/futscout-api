import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryUsersRepository } from '../repositories/in-memory/in-merory-users-repository.js'
import { InMemoryVerificationCodeRepository } from '../repositories/in-memory/in-memory-verification-code-repository.js'
import { VerifyEmailUseCase } from './verify-email.js'

let usersRepository: InMemoryUsersRepository
let verificationCodeRepository: InMemoryVerificationCodeRepository
let sut: VerifyEmailUseCase

describe('Verify Email Use Case', () => {
  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository()
    verificationCodeRepository = new InMemoryVerificationCodeRepository()
    sut = new VerifyEmailUseCase(usersRepository, verificationCodeRepository)
  })

  it('should be able to verify email with valid code', async () => {
    // Criar usuário inativo
    const user = await usersRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      role: 'ATHLETE',
      isActive: false,
    })

    // Criar código de verificação válido
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutos
    await verificationCodeRepository.create({
      code: '123456',
      email: 'john@example.com',
      userId: user.id,
      type: 'EMAIL_VERIFICATION',
      expiresAt,
    })

    // Verificar email
    const result = await sut.execute({
      email: 'john@example.com',
      code: '123456',
    })

    expect(result.success).toBe(true)
    expect(result.message).toBe('Email verificado com sucesso')

    // Verificar se usuário foi ativado
    const updatedUser = await usersRepository.findById(user.id)
    expect(updatedUser?.isActive).toBe(true)
  })

  it('should not be able to verify email with invalid code', async () => {
    const result = await sut.execute({
      email: 'john@example.com',
      code: '999999',
    })

    expect(result.success).toBe(false)
    expect(result.message).toBe('Código inválido ou expirado')
  })

  it('should not be able to verify email with expired code', async () => {
    // Criar usuário
    const user = await usersRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      role: 'ATHLETE',
      isActive: false,
    })

    // Criar código expirado
    const expiresAt = new Date(Date.now() - 1000) // Expirado há 1 segundo
    await verificationCodeRepository.create({
      code: '123456',
      email: 'john@example.com',
      userId: user.id,
      type: 'EMAIL_VERIFICATION',
      expiresAt,
    })

    const result = await sut.execute({
      email: 'john@example.com',
      code: '123456',
    })

    expect(result.success).toBe(false)
    expect(result.message).toBe('Código inválido ou expirado')
  })

  it('should not be able to use the same code twice', async () => {
    // Criar usuário
    const user = await usersRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      role: 'ATHLETE',
      isActive: false,
    })

    // Criar código válido
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
    await verificationCodeRepository.create({
      code: '123456',
      email: 'john@example.com',
      userId: user.id,
      type: 'EMAIL_VERIFICATION',
      expiresAt,
    })

    // Usar código pela primeira vez
    await sut.execute({
      email: 'john@example.com',
      code: '123456',
    })

    // Tentar usar o mesmo código novamente
    const result = await sut.execute({
      email: 'john@example.com',
      code: '123456',
    })

    expect(result.success).toBe(false)
    expect(result.message).toBe('Código inválido ou expirado')
  })

  it('should clean up other codes from same email after successful verification', async () => {
    // Criar usuário
    const user = await usersRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      role: 'ATHLETE',
      isActive: false,
    })

    // Criar múltiplos códigos para o mesmo email
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    await verificationCodeRepository.create({
      code: '123456',
      email: 'john@example.com',
      userId: user.id,
      type: 'EMAIL_VERIFICATION',
      expiresAt,
    })

    await verificationCodeRepository.create({
      code: '654321',
      email: 'john@example.com',
      userId: user.id,
      type: 'EMAIL_VERIFICATION',
      expiresAt,
    })

    // Verificar com um código
    await sut.execute({
      email: 'john@example.com',
      code: '123456',
    })

    // Verificar se todos os códigos do email foram removidos
    const remainingCode = await verificationCodeRepository.findByCodeAndEmail(
      '654321',
      'john@example.com',
    )

    expect(remainingCode).toBeNull()
  })
})
