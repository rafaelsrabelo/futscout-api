import type { VerificationCode } from 'generated/prisma/client.js'

export interface CreateVerificationCodeData {
  code: string
  email: string
  userId?: string
  type: string
  expiresAt: Date
}

export interface VerificationCodeRepository {
  create(data: CreateVerificationCodeData): Promise<VerificationCode>
  findByCodeAndEmail(
    code: string,
    email: string,
  ): Promise<VerificationCode | null>
  markAsUsed(id: string): Promise<VerificationCode>
  deleteExpiredCodes(): Promise<void>
  deleteByEmail(email: string): Promise<void>
}
