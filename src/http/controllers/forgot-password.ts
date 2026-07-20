import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { PrismaUsersRepository } from '../repositories/prisma/prisma-users-repository.js'
import { PrismaVerificationCodeRepository } from '../repositories/prisma/prisma-verification-code-repository.js'
import { ForgotPasswordUseCase } from '../use-cases/forgot-password.js'

// Mensagem genérica: idêntica para email existente ou não, para não vazar a
// existência de contas.
const GENERIC_MESSAGE =
  'Se houver uma conta associada a este email, enviaremos um código de verificação.'

export async function forgotPassword(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const forgotPasswordBodySchema = z.object({
    email: z.string().email(),
  })

  const { email } = forgotPasswordBodySchema.parse(request.body)

  const usersRepository = new PrismaUsersRepository()
  const verificationCodeRepository = new PrismaVerificationCodeRepository()
  const forgotPasswordUseCase = new ForgotPasswordUseCase(
    usersRepository,
    verificationCodeRepository,
  )

  try {
    await forgotPasswordUseCase.execute({ email })
  } catch (error) {
    // Qualquer falha interna também responde 200 — a resposta não pode
    // diferenciar os casos. O erro fica no log para diagnóstico.
    console.error('Erro no fluxo de forgot-password:', error)
  }

  return reply.status(200).send({ message: GENERIC_MESSAGE })
}
