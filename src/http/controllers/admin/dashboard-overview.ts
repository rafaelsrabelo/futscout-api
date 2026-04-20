import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaDashboardRepository } from '../../repositories/prisma/prisma-dashboard-repository.js'
import { DashboardOverviewUseCase } from '../../use-cases/admin/dashboard-overview.js'

const querySchema = z.object({
  periodDays: z.coerce.number().int().min(1).max(365).optional().default(30),
})

export async function dashboardOverviewAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { periodDays } = querySchema.parse(request.query)
  const dashboardRepository = new PrismaDashboardRepository()
  const useCase = new DashboardOverviewUseCase(dashboardRepository)
  const result = await useCase.execute({ periodDays })
  return reply.status(200).send(result)
}
