import type { FastifyReply, FastifyRequest } from 'fastify'
import z from 'zod'
import { PrismaAthleteProfileRepository } from '../repositories/prisma/prisma-athlete-profile-repository.js'
import { PrismaUsersRepository } from '../repositories/prisma/prisma-users-repository.js'
import { EmailAlreadyExistsError } from '../use-cases/errors/email-already-exists-error.js'
import { RecoveryValidationError } from '../use-cases/errors/recovery-validation-error.js'
import { RecoverAccessByCpfUseCase } from '../use-cases/recover-access-by-cpf.js'

function normalizeCpf(raw: string): string {
  return raw.replace(/\D/g, '').padStart(11, '0')
}

export async function recoverAccessByCpf(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const bodySchema = z.object({
    email: z.string().email(),
    cpf: z.string().min(11),
    birthDate: z.string().min(8),
  })

  const { email, cpf, birthDate } = bodySchema.parse(request.body)

  try {
    const usersRepository = new PrismaUsersRepository()
    const athleteProfileRepository = new PrismaAthleteProfileRepository()
    const useCase = new RecoverAccessByCpfUseCase(
      usersRepository,
      athleteProfileRepository,
    )

    await useCase.execute({
      email,
      cpf: normalizeCpf(cpf),
      birthDate,
    })

    return reply.status(200).send({
      message: 'Senha enviada para o email informado.',
    })
  } catch (error) {
    if (error instanceof RecoveryValidationError) {
      return reply.status(401).send({ message: error.message })
    }
    if (error instanceof EmailAlreadyExistsError) {
      return reply.status(409).send({ message: error.message })
    }
    throw error
  }
}
