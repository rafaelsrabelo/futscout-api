import { prisma } from '@/lib/prisma.js'
import type {
  VerificationCodeRepository,
  CreateVerificationCodeData,
} from '../verification-code-repository.js'

export class PrismaVerificationCodeRepository
  implements VerificationCodeRepository
{
  async create(data: CreateVerificationCodeData) {
    const verificationCode = await prisma.verificationCode.create({
      data,
    })

    return verificationCode
  }

  async findByCodeAndEmail(code: string, email: string) {
    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        code,
        email,
        expiresAt: {
          gt: new Date(), // Código ainda não expirou
        },
        usedAt: null, // Código ainda não foi usado
      },
    })

    return verificationCode
  }

  async markAsUsed(id: string) {
    const verificationCode = await prisma.verificationCode.update({
      where: { id },
      data: {
        usedAt: new Date(),
      },
    })

    return verificationCode
  }

  async deleteExpiredCodes() {
    await prisma.verificationCode.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    })
  }

  async deleteByEmail(email: string) {
    await prisma.verificationCode.deleteMany({
      where: { email },
    })
  }
}
