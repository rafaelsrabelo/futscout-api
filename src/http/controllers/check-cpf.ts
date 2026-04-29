import type { FastifyReply, FastifyRequest } from 'fastify'
import z from 'zod'
import { PrismaUsersRepository } from '../repositories/prisma/prisma-users-repository.js'
import { CheckCpfExistsUseCase } from '../use-cases/check-cpf-exists.js'

function normalizeCpf(raw: string): string {
  return raw.replace(/\D/g, '').padStart(11, '0')
}

export async function checkCpf(request: FastifyRequest, reply: FastifyReply) {
  const bodySchema = z.object({
    cpf: z.string().min(11),
  })

  const { cpf } = bodySchema.parse(request.body)
  const normalized = normalizeCpf(cpf)

  const usersRepository = new PrismaUsersRepository()
  const useCase = new CheckCpfExistsUseCase(usersRepository)
  const { exists } = await useCase.execute(normalized)

  return reply.status(200).send({ exists })
}
