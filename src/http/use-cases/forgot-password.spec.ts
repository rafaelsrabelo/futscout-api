import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InMemoryUsersRepository } from '../repositories/in-memory/in-merory-users-repository.js'
import { InMemoryVerificationCodeRepository } from '../repositories/in-memory/in-memory-verification-code-repository.js'
import { ForgotPasswordUseCase } from './forgot-password.js'
import { emailService } from '@/lib/email.js'

let usersRepository: InMemoryUsersRepository
let verificationCodeRepository: InMemoryVerificationCodeRepository
let sut: ForgotPasswordUseCase

describe('Forgot Password Use Case', () => {
  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository()
    verificationCodeRepository = new InMemoryVerificationCodeRepository()
    sut = new ForgotPasswordUseCase(usersRepository, verificationCodeRepository)

    // `spyOn` reaproveita o spy já instalado — sem o reset, o histórico de
    // chamadas vazaria de um teste para o outro.
    vi.restoreAllMocks()
    vi.spyOn(emailService, 'sendPasswordResetCodeEmail').mockResolvedValue(null)
  })

  async function createUser(email = 'john@example.com') {
    return usersRepository.create({
      name: 'John Doe',
      email,
      password: 'password123',
      role: 'ATHLETE',
      isActive: true,
    })
  }

  it('should generate a PASSWORD_RESET code for an existing email', async () => {
    const user = await createUser()

    await sut.execute({ email: 'john@example.com' })

    expect(verificationCodeRepository.items).toHaveLength(1)

    const created = verificationCodeRepository.items[0]!
    expect(created.type).toBe('PASSWORD_RESET')
    expect(created.email).toBe('john@example.com')
    expect(created.userId).toBe(user.id)
    expect(created.code).toMatch(/^\d{6}$/)
    expect(created.usedAt).toBeNull()
  })

  it('should set the code expiration to 15 minutes', async () => {
    await createUser()

    const before = Date.now()
    await sut.execute({ email: 'john@example.com' })

    const created = verificationCodeRepository.items[0]!
    const diffInMinutes = (created.expiresAt.getTime() - before) / 1000 / 60

    expect(diffInMinutes).toBeGreaterThan(14)
    expect(diffInMinutes).toBeLessThanOrEqual(15.1)
  })

  it('should send the reset code by email', async () => {
    await createUser()

    await sut.execute({ email: 'john@example.com' })

    const created = verificationCodeRepository.items[0]!

    expect(emailService.sendPasswordResetCodeEmail).toHaveBeenCalledWith(
      'john@example.com',
      created.code,
      'John Doe',
    )
  })

  it('should not create any code when the email does not exist', async () => {
    await sut.execute({ email: 'nobody@example.com' })

    expect(verificationCodeRepository.items).toHaveLength(0)
    expect(emailService.sendPasswordResetCodeEmail).not.toHaveBeenCalled()
  })

  it('should invalidate previous unused codes when generating a new one', async () => {
    const user = await createUser()

    await verificationCodeRepository.create({
      code: '111111',
      email: 'john@example.com',
      userId: user.id,
      type: 'PASSWORD_RESET',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    })

    await sut.execute({ email: 'john@example.com' })

    const oldCode = verificationCodeRepository.items.find(
      (item) => item.code === '111111',
    )

    expect(oldCode?.usedAt).toBeInstanceOf(Date)

    // O código antigo não pode mais ser encontrado como válido
    const stillValid = await verificationCodeRepository.findByCodeAndEmail(
      '111111',
      'john@example.com',
      'PASSWORD_RESET',
    )
    expect(stillValid).toBeNull()
  })

  it('should not invalidate codes from other flows', async () => {
    const user = await createUser()

    await verificationCodeRepository.create({
      code: '222222',
      email: 'john@example.com',
      userId: user.id,
      type: 'EMAIL_VERIFICATION',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    })

    await sut.execute({ email: 'john@example.com' })

    const emailCode = verificationCodeRepository.items.find(
      (item) => item.code === '222222',
    )

    expect(emailCode?.usedAt).toBeNull()
  })

  it('should normalize the email before lookup and storage', async () => {
    await createUser()

    await sut.execute({ email: '  JOHN@Example.com  ' })

    expect(verificationCodeRepository.items).toHaveLength(1)
    expect(verificationCodeRepository.items[0]!.email).toBe('john@example.com')
  })

  it('should not throw when the email service fails', async () => {
    await createUser()

    vi.spyOn(emailService, 'sendPasswordResetCodeEmail').mockRejectedValue(
      new Error('SMTP down'),
    )

    await expect(
      sut.execute({ email: 'john@example.com' }),
    ).resolves.toBeUndefined()
  })
})
