import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { PrismaVerificationCodeRepository } from '../repositories/prisma/prisma-verification-code-repository.js'
import { VerifyPasswordResetCodeUseCase } from '../use-cases/verify-password-reset-code.js'
import { InvalidVerificationCodeError } from '../use-cases/errors/invalid-verification-code-error.js'
import { TooManyAttemptsError } from '../use-cases/errors/too-many-attempts-error.js'
import { PASSWORD_RESET_SCOPE } from '../use-cases/password-reset-scope.js'

export async function verifyPasswordResetCode(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const verifyBodySchema = z.object({
    email: z.string().email(),
    code: z.string().length(6),
  })

  const { email, code } = verifyBodySchema.parse(request.body)

  const verificationCodeRepository = new PrismaVerificationCodeRepository()
  const verifyUseCase = new VerifyPasswordResetCodeUseCase(
    verificationCodeRepository,
  )

  try {
    const { userId, codeId } = await verifyUseCase.execute({ email, code })

    // Token de curta duração e escopo próprio: um access token de sessão não
    // serve em /auth/reset-password e vice-versa.
    const resetToken = await reply.jwtSign(
      { scope: PASSWORD_RESET_SCOPE, codeId },
      {
        sub: userId,
        expiresIn: '10m',
      },
    )

    return reply.status(200).send({ resetToken })
  } catch (error) {
    if (error instanceof TooManyAttemptsError) {
      return reply.status(429).send({ message: error.message })
    }

    if (error instanceof InvalidVerificationCodeError) {
      return reply.status(400).send({ message: error.message })
    }

    throw error
  }
}
