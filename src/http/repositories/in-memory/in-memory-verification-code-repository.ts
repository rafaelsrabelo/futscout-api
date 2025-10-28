import type { VerificationCode } from 'generated/prisma/client.js'
import type {
  VerificationCodeRepository,
  CreateVerificationCodeData,
} from '../verification-code-repository.js'

export class InMemoryVerificationCodeRepository
  implements VerificationCodeRepository
{
  public items: VerificationCode[] = []

  async create(data: CreateVerificationCodeData): Promise<VerificationCode> {
    const verificationCode: VerificationCode = {
      id: `code-${this.items.length + 1}`,
      code: data.code,
      email: data.email,
      userId: data.userId || null,
      type: data.type,
      expiresAt: data.expiresAt,
      usedAt: null,
      createdAt: new Date(),
    }

    this.items.push(verificationCode)
    return verificationCode
  }

  async findByCodeAndEmail(
    code: string,
    email: string,
  ): Promise<VerificationCode | null> {
    const now = new Date()
    const verificationCode = this.items.find(
      (item) =>
        item.code === code &&
        item.email === email &&
        item.expiresAt > now &&
        item.usedAt === null,
    )

    return verificationCode || null
  }

  async markAsUsed(id: string): Promise<VerificationCode> {
    const codeIndex = this.items.findIndex((item) => item.id === id)

    if (codeIndex === -1) {
      throw new Error('Verification code not found')
    }

    this.items[codeIndex]!.usedAt = new Date()
    return this.items[codeIndex]!
  }

  async deleteExpiredCodes(): Promise<void> {
    const now = new Date()
    this.items = this.items.filter((item) => item.expiresAt > now)
  }

  async deleteByEmail(email: string): Promise<void> {
    this.items = this.items.filter((item) => item.email !== email)
  }
}
