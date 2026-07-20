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
  // `type` é opcional por compatibilidade, mas deve ser informado sempre que o
  // chamador souber o tipo esperado — sem ele, um código de um fluxo (ex.:
  // PASSWORD_RESET) poderia ser aceito por outro (ex.: EMAIL_VERIFICATION).
  findByCodeAndEmail(
    code: string,
    email: string,
    type?: string,
  ): Promise<VerificationCode | null>
  findById(id: string): Promise<VerificationCode | null>
  markAsUsed(id: string): Promise<VerificationCode>
  deleteExpiredCodes(): Promise<void>
  deleteByEmail(email: string): Promise<void>
  // Invalida (marca como usados) os códigos pendentes de um email/tipo.
  // Usado ao gerar um novo código, para que os anteriores parem de valer.
  invalidateByEmailAndType(email: string, type: string): Promise<void>
}
