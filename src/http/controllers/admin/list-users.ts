import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaUsersRepository } from '../../repositories/prisma/prisma-users-repository.js'
import { ListUsersAdminUseCase } from '../../use-cases/admin/list-users.js'

const listUsersAdminQuerySchema = z.object({
  q: z.string().optional(),
  role: z.enum(['ATHLETE', 'OBSERVER', 'none']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export async function listUsersAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { q, role, page, pageSize } = listUsersAdminQuerySchema.parse(
    request.query,
  )

  const usersRepository = new PrismaUsersRepository()
  const useCase = new ListUsersAdminUseCase(usersRepository)

  const result = await useCase.execute({ q, role, page, pageSize })

  return reply.status(200).send({
    items: result.items.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      cpf: u.cpf,
      role: u.role,
      isActive: u.isActive,
      emailVerified: u.emailVerified,
      isImported: u.isImported,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      hasAthleteProfile: u.hasAthleteProfile,
      hasObserverProfile: u.hasObserverProfile,
      activePlan: u.activePlan,
    })),
    pagination: {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: result.totalPages,
    },
  })
}
