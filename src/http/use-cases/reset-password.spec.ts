import { compare } from 'bcryptjs'
import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryUsersRepository } from '../repositories/in-memory/in-merory-users-repository.js'
import { InMemoryVerificationCodeRepository } from '../repositories/in-memory/in-memory-verification-code-repository.js'
import { ResetPasswordUseCase } from './reset-password.js'
import { InvalidResetTokenError } from './errors/invalid-reset-token-error.js'

let usersRepository: InMemoryUsersRepository
let verificationCodeRepository: InMemoryVerificationCodeRepository
let sut: ResetPasswordUseCase

describe('Reset Password Use Case', () => {
  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository()
    verificationCodeRepository = new InMemoryVerificationCodeRepository()
    sut = new ResetPasswordUseCase(usersRepository, verificationCodeRepository)
  })

  async function createUserAndCode() {
    const user = await usersRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'old-hash',
      role: 'ATHLETE',
      isActive: true,
    })

    const code = await verificationCodeRepository.create({
      code: '123456',
      email: 'john@example.com',
      userId: user.id,
      type: 'PASSWORD_RESET',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    })

    return { user, code }
  }

  it('should hash and update the user password', async () => {
    const { user, code } = await createUserAndCode()

    await sut.execute({
      userId: user.id,
      codeId: code.id,
      password: 'new-password',
    })

    const updated = await usersRepository.findById(user.id)

    expect(updated?.password).not.toBe('new-password')
    expect(await compare('new-password', updated!.password)).toBe(true)
  })

  it('should mark the verification code as used', async () => {
    const { user, code } = await createUserAndCode()

    await sut.execute({
      userId: user.id,
      codeId: code.id,
      password: 'new-password',
    })

    const stored = await verificationCodeRepository.findById(code.id)
    expect(stored?.usedAt).toBeInstanceOf(Date)
  })

  it('should not allow reusing the same code twice', async () => {
    const { user, code } = await createUserAndCode()

    await sut.execute({
      userId: user.id,
      codeId: code.id,
      password: 'new-password',
    })

    await expect(
      sut.execute({
        userId: user.id,
        codeId: code.id,
        password: 'another-password',
      }),
    ).rejects.toBeInstanceOf(InvalidResetTokenError)
  })

  it('should reject an unknown codeId', async () => {
    const { user } = await createUserAndCode()

    await expect(
      sut.execute({
        userId: user.id,
        codeId: 'does-not-exist',
        password: 'new-password',
      }),
    ).rejects.toBeInstanceOf(InvalidResetTokenError)
  })

  it('should reject a code that belongs to another user', async () => {
    const { code } = await createUserAndCode()

    const otherUser = await usersRepository.create({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'hash',
      role: 'ATHLETE',
      isActive: true,
    })

    await expect(
      sut.execute({
        userId: otherUser.id,
        codeId: code.id,
        password: 'new-password',
      }),
    ).rejects.toBeInstanceOf(InvalidResetTokenError)
  })

  it('should reject a code from another flow (EMAIL_VERIFICATION)', async () => {
    const { user } = await createUserAndCode()

    const emailCode = await verificationCodeRepository.create({
      code: '654321',
      email: 'john@example.com',
      userId: user.id,
      type: 'EMAIL_VERIFICATION',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    })

    await expect(
      sut.execute({
        userId: user.id,
        codeId: emailCode.id,
        password: 'new-password',
      }),
    ).rejects.toBeInstanceOf(InvalidResetTokenError)
  })

  it('should reject when the user no longer exists', async () => {
    const { user, code } = await createUserAndCode()

    await usersRepository.delete(user.id)

    await expect(
      sut.execute({
        userId: user.id,
        codeId: code.id,
        password: 'new-password',
      }),
    ).rejects.toBeInstanceOf(InvalidResetTokenError)
  })

  it('should not consume the code when the reset fails', async () => {
    const { code } = await createUserAndCode()

    await sut
      .execute({
        userId: 'other-user',
        codeId: code.id,
        password: 'new-password',
      })
      .catch(() => {})

    const stored = await verificationCodeRepository.findById(code.id)
    expect(stored?.usedAt).toBeNull()
  })
})
