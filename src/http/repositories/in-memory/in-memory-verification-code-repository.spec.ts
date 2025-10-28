import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryVerificationCodeRepository } from './in-memory-verification-code-repository.js'

let verificationCodeRepository: InMemoryVerificationCodeRepository

describe('In Memory Verification Code Repository', () => {
  beforeEach(() => {
    verificationCodeRepository = new InMemoryVerificationCodeRepository()
  })

  it('should be able to create a verification code', async () => {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    const verificationCode = await verificationCodeRepository.create({
      code: '123456',
      email: 'john@example.com',
      userId: 'user-01',
      type: 'EMAIL_VERIFICATION',
      expiresAt,
    })

    expect(verificationCode.id).toEqual(expect.any(String))
    expect(verificationCode.code).toEqual('123456')
    expect(verificationCode.email).toEqual('john@example.com')
    expect(verificationCode.userId).toEqual('user-01')
    expect(verificationCode.type).toEqual('EMAIL_VERIFICATION')
    expect(verificationCode.usedAt).toBeNull()
  })

  it('should be able to find verification code by code and email', async () => {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    await verificationCodeRepository.create({
      code: '123456',
      email: 'john@example.com',
      userId: 'user-01',
      type: 'EMAIL_VERIFICATION',
      expiresAt,
    })

    const foundCode = await verificationCodeRepository.findByCodeAndEmail(
      '123456',
      'john@example.com',
    )

    expect(foundCode).not.toBeNull()
    expect(foundCode?.code).toEqual('123456')
    expect(foundCode?.email).toEqual('john@example.com')
  })

  it('should not find expired verification code', async () => {
    const expiresAt = new Date(Date.now() - 1000) // Expirado

    await verificationCodeRepository.create({
      code: '123456',
      email: 'john@example.com',
      userId: 'user-01',
      type: 'EMAIL_VERIFICATION',
      expiresAt,
    })

    const foundCode = await verificationCodeRepository.findByCodeAndEmail(
      '123456',
      'john@example.com',
    )

    expect(foundCode).toBeNull()
  })

  it('should not find used verification code', async () => {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    const verificationCode = await verificationCodeRepository.create({
      code: '123456',
      email: 'john@example.com',
      userId: 'user-01',
      type: 'EMAIL_VERIFICATION',
      expiresAt,
    })

    // Marcar como usado
    await verificationCodeRepository.markAsUsed(verificationCode.id)

    const foundCode = await verificationCodeRepository.findByCodeAndEmail(
      '123456',
      'john@example.com',
    )

    expect(foundCode).toBeNull()
  })

  it('should be able to mark code as used', async () => {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    const verificationCode = await verificationCodeRepository.create({
      code: '123456',
      email: 'john@example.com',
      userId: 'user-01',
      type: 'EMAIL_VERIFICATION',
      expiresAt,
    })

    const usedCode = await verificationCodeRepository.markAsUsed(
      verificationCode.id,
    )

    expect(usedCode.usedAt).not.toBeNull()
    expect(usedCode.usedAt).toBeInstanceOf(Date)
  })

  it('should be able to delete codes by email', async () => {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    await verificationCodeRepository.create({
      code: '123456',
      email: 'john@example.com',
      userId: 'user-01',
      type: 'EMAIL_VERIFICATION',
      expiresAt,
    })

    await verificationCodeRepository.create({
      code: '654321',
      email: 'john@example.com',
      userId: 'user-01',
      type: 'EMAIL_VERIFICATION',
      expiresAt,
    })

    await verificationCodeRepository.deleteByEmail('john@example.com')

    const foundCode1 = await verificationCodeRepository.findByCodeAndEmail(
      '123456',
      'john@example.com',
    )
    const foundCode2 = await verificationCodeRepository.findByCodeAndEmail(
      '654321',
      'john@example.com',
    )

    expect(foundCode1).toBeNull()
    expect(foundCode2).toBeNull()
  })

  it('should be able to delete expired codes', async () => {
    const expiredDate = new Date(Date.now() - 1000)
    const validDate = new Date(Date.now() + 15 * 60 * 1000)

    await verificationCodeRepository.create({
      code: '123456',
      email: 'john@example.com',
      userId: 'user-01',
      type: 'EMAIL_VERIFICATION',
      expiresAt: expiredDate,
    })

    await verificationCodeRepository.create({
      code: '654321',
      email: 'jane@example.com',
      userId: 'user-02',
      type: 'EMAIL_VERIFICATION',
      expiresAt: validDate,
    })

    await verificationCodeRepository.deleteExpiredCodes()

    // Código expirado deve ter sido removido
    const expiredCode = await verificationCodeRepository.findByCodeAndEmail(
      '123456',
      'john@example.com',
    )
    expect(expiredCode).toBeNull()

    // Código válido deve permanecer (mas não será encontrado pela busca normal)
    // Vamos verificar se ainda existe no repositório
    expect(verificationCodeRepository.items).toHaveLength(1)
    expect(verificationCodeRepository.items[0]?.code).toEqual('654321')
  })
})
