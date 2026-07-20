import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryVerificationCodeRepository } from '../repositories/in-memory/in-memory-verification-code-repository.js'
import { VerifyPasswordResetCodeUseCase } from './verify-password-reset-code.js'
import { InvalidVerificationCodeError } from './errors/invalid-verification-code-error.js'
import { TooManyAttemptsError } from './errors/too-many-attempts-error.js'
import { AttemptLimiter } from '@/lib/attempt-limiter.js'

let verificationCodeRepository: InMemoryVerificationCodeRepository
let attemptLimiter: AttemptLimiter
let sut: VerifyPasswordResetCodeUseCase

const VALID_EXPIRATION = () => new Date(Date.now() + 15 * 60 * 1000)

describe('Verify Password Reset Code Use Case', () => {
  beforeEach(() => {
    verificationCodeRepository = new InMemoryVerificationCodeRepository()
    // Limitador isolado por teste (5 tentativas / 15 min)
    attemptLimiter = new AttemptLimiter(5, 15)
    sut = new VerifyPasswordResetCodeUseCase(
      verificationCodeRepository,
      attemptLimiter,
    )
  })

  async function createCode(
    overrides: Partial<{
      code: string
      email: string
      userId: string
      type: string
      expiresAt: Date
    }> = {},
  ) {
    return verificationCodeRepository.create({
      code: '123456',
      email: 'john@example.com',
      userId: 'user-1',
      type: 'PASSWORD_RESET',
      expiresAt: VALID_EXPIRATION(),
      ...overrides,
    })
  }

  it('should return userId and codeId for a valid code', async () => {
    const created = await createCode()

    const result = await sut.execute({
      email: 'john@example.com',
      code: '123456',
    })

    expect(result.userId).toBe('user-1')
    expect(result.codeId).toBe(created.id)
  })

  it('should not mark the code as used on verification', async () => {
    const created = await createCode()

    await sut.execute({ email: 'john@example.com', code: '123456' })

    const stored = await verificationCodeRepository.findById(created.id)
    expect(stored?.usedAt).toBeNull()
  })

  it('should reject a wrong code', async () => {
    await createCode()

    await expect(
      sut.execute({ email: 'john@example.com', code: '999999' }),
    ).rejects.toBeInstanceOf(InvalidVerificationCodeError)
  })

  it('should reject an expired code', async () => {
    await createCode({ expiresAt: new Date(Date.now() - 1000) })

    await expect(
      sut.execute({ email: 'john@example.com', code: '123456' }),
    ).rejects.toBeInstanceOf(InvalidVerificationCodeError)
  })

  it('should reject an already used code', async () => {
    const created = await createCode()
    await verificationCodeRepository.markAsUsed(created.id)

    await expect(
      sut.execute({ email: 'john@example.com', code: '123456' }),
    ).rejects.toBeInstanceOf(InvalidVerificationCodeError)
  })

  it('should reject a code from another type (EMAIL_VERIFICATION)', async () => {
    await createCode({ type: 'EMAIL_VERIFICATION' })

    await expect(
      sut.execute({ email: 'john@example.com', code: '123456' }),
    ).rejects.toBeInstanceOf(InvalidVerificationCodeError)
  })

  it('should reject a code belonging to another email', async () => {
    await createCode()

    await expect(
      sut.execute({ email: 'other@example.com', code: '123456' }),
    ).rejects.toBeInstanceOf(InvalidVerificationCodeError)
  })

  it('should normalize the email before lookup', async () => {
    await createCode()

    const result = await sut.execute({
      email: '  JOHN@Example.com ',
      code: '123456',
    })

    expect(result.userId).toBe('user-1')
  })

  it('should block after 5 failed attempts', async () => {
    await createCode()

    // 4 tentativas erradas ainda retornam "código inválido"
    for (let i = 0; i < 4; i++) {
      await expect(
        sut.execute({ email: 'john@example.com', code: '000000' }),
      ).rejects.toBeInstanceOf(InvalidVerificationCodeError)
    }

    // A 5ª estoura o limite
    await expect(
      sut.execute({ email: 'john@example.com', code: '000000' }),
    ).rejects.toBeInstanceOf(TooManyAttemptsError)
  })

  it('should invalidate the pending code once the attempt limit is hit', async () => {
    const created = await createCode()

    for (let i = 0; i < 5; i++) {
      await sut
        .execute({ email: 'john@example.com', code: '000000' })
        .catch(() => {})
    }

    const stored = await verificationCodeRepository.findById(created.id)
    expect(stored?.usedAt).toBeInstanceOf(Date)

    // Mesmo o código correto deixa de funcionar
    await expect(
      sut.execute({ email: 'john@example.com', code: '123456' }),
    ).rejects.toBeInstanceOf(TooManyAttemptsError)
  })

  it('should reset the attempt counter after a successful verification', async () => {
    await createCode()

    for (let i = 0; i < 3; i++) {
      await sut
        .execute({ email: 'john@example.com', code: '000000' })
        .catch(() => {})
    }

    await sut.execute({ email: 'john@example.com', code: '123456' })

    expect(attemptLimiter.isBlocked('john@example.com')).toBe(false)
  })

  it('should not let one email block another', async () => {
    await createCode()
    await createCode({ email: 'jane@example.com', code: '654321' })

    for (let i = 0; i < 5; i++) {
      await sut
        .execute({ email: 'john@example.com', code: '000000' })
        .catch(() => {})
    }

    const result = await sut.execute({
      email: 'jane@example.com',
      code: '654321',
    })

    expect(result.userId).toBe('user-1')
  })
})
