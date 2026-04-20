import type { FastifyReply, FastifyRequest } from 'fastify'

import { PrismaDashboardRepository } from '../../repositories/prisma/prisma-dashboard-repository.js'
import { DashboardUserActivityUseCase } from '../../use-cases/admin/dashboard-user-activity.js'

export async function dashboardUserActivityAdmin(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  const dashboardRepository = new PrismaDashboardRepository()
  const useCase = new DashboardUserActivityUseCase(dashboardRepository)
  const result = await useCase.execute()
  return reply.status(200).send(result)
}
