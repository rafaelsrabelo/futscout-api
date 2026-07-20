import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { PrismaUsersRepository } from '../repositories/prisma/prisma-users-repository.js'
import { PrismaVerificationCodeRepository } from '../repositories/prisma/prisma-verification-code-repository.js'
import { ResetPasswordUseCase } from '../use-cases/reset-password.js'
import { InvalidResetTokenError } from '../use-cases/errors/invalid-reset-token-error.js'
import { PASSWORD_RESET_SCOPE } from '../use-cases/password-reset-scope.js'

interface ResetTokenPayload {
  sub: string
  scope?: string
  codeId?: string
}

export async function resetPassword(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const resetPasswordBodySchema = z.object({
    resetToken: z.string(),
    password: z.string().min(6),
  })

  const { resetToken, password } = resetPasswordBodySchema.parse(request.body)

  let payload: ResetTokenPayload

  try {
    payload = request.server.jwt.verify<ResetTokenPayload>(resetToken)
  } catch {
    return reply
      .status(401)
      .send({ message: new InvalidResetTokenError().message })
  }

  // Checagem de escopo: sem isso um access token de sessão comum trocaria a
  // senha do próprio dono sem passar pelo código enviado por email.
  if (
    payload.scope !== PASSWORD_RESET_SCOPE ||
    !payload.codeId ||
    !payload.sub
  ) {
    return reply
      .status(401)
      .send({ message: new InvalidResetTokenError().message })
  }

  const usersRepository = new PrismaUsersRepository()
  const verificationCodeRepository = new PrismaVerificationCodeRepository()
  const resetPasswordUseCase = new ResetPasswordUseCase(
    usersRepository,
    verificationCodeRepository,
  )

  try {
    await resetPasswordUseCase.execute({
      userId: payload.sub,
      codeId: payload.codeId,
      password,
    })

    return reply.status(200).send({ message: 'Senha alterada com sucesso.' })
  } catch (error) {
    if (error instanceof InvalidResetTokenError) {
      return reply.status(401).send({ message: error.message })
    }

    throw error
  }
}
