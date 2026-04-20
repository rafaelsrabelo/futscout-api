import type { FastifyReply, FastifyRequest } from 'fastify'

import { PrismaDashboardRepository } from '../../repositories/prisma/prisma-dashboard-repository.js'
import { DashboardInactivityBucketsUseCase } from '../../use-cases/admin/dashboard-inactivity-buckets.js'

export async function dashboardInactivityBucketsAdmin(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  const dashboardRepository = new PrismaDashboardRepository()
  const useCase = new DashboardInactivityBucketsUseCase(dashboardRepository)
  const result = await useCase.execute()
  return reply.status(200).send(result)
}
