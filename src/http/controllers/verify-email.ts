import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { PrismaUsersRepository } from '../repositories/prisma/prisma-users-repository.js'
import { PrismaVerificationCodeRepository } from '../repositories/prisma/prisma-verification-code-repository.js'
import { VerifyEmailUseCase } from '../use-cases/verify-email.js'

export async function verifyEmail(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const verifyEmailBodySchema = z.object({
    email: z.string().email(),
    code: z.string().length(6),
  })

  try {
    const { email, code } = verifyEmailBodySchema.parse(request.body)

    const usersRepository = new PrismaUsersRepository()
    const verificationCodeRepository = new PrismaVerificationCodeRepository()
    const verifyEmailUseCase = new VerifyEmailUseCase(
      usersRepository,
      verificationCodeRepository,
    )

    const result = await verifyEmailUseCase.execute({ email, code })

    if (result.success) {
      return reply.status(200).send({
        message: result.message,
      })
    } else {
      return reply.status(400).send({
        message: result.message,
      })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        message: 'Validation error',
        issues: error.format(),
      })
    }

    return reply.status(500).send({ message: 'Internal server error' })
  }
}
