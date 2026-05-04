import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaUsersRepository } from '../../repositories/prisma/prisma-users-repository.js'
import { UserNotFoundError } from '../../use-cases/admin/errors/user-not-found-error.js'
import { UpdateUserAdminUseCase } from '../../use-cases/admin/update-user.js'
import { CpfAlreadyExistsError } from '../../use-cases/errors/cpf-already-exists-error.js'
import { EmailAlreadyExistsError } from '../../use-cases/errors/email-already-exists-error.js'
import { InvalidCpfError } from '../../use-cases/errors/invalid-cpf-error.js'

const paramsSchema = z.object({ id: z.uuid('ID inválido.') })

const bodySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().email().max(160).optional(),
  cpf: z.string().nullable().optional(),
  role: z.enum(['ATHLETE', 'OBSERVER']).nullable().optional(),
  isActive: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
  isImported: z.boolean().optional(),
})

export async function updateUserAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = paramsSchema.parse(request.params)
  const body = bodySchema.parse(request.body)

  const useCase = new UpdateUserAdminUseCase(new PrismaUsersRepository())

  try {
    const updated = await useCase.execute({ userId: id, ...body })
    return reply.status(200).send({
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        cpf: updated.cpf,
        role: updated.role,
        isActive: updated.isActive,
        emailVerified: updated.emailVerified,
        isImported: updated.isImported,
        updatedAt: updated.updatedAt,
      },
    })
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return reply.status(404).send({ message: 'Usuário não encontrado.' })
    }
    if (error instanceof EmailAlreadyExistsError) {
      return reply.status(409).send({ message: 'E-mail já cadastrado.' })
    }
    if (error instanceof CpfAlreadyExistsError) {
      return reply.status(409).send({ message: 'CPF já cadastrado.' })
    }
    if (error instanceof InvalidCpfError) {
      return reply.status(400).send({ message: 'CPF inválido.' })
    }
    throw error
  }
}
