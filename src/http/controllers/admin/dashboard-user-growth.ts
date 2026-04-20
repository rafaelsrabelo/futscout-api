import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { PrismaDashboardRepository } from '../../repositories/prisma/prisma-dashboard-repository.js'
import {
  DashboardUserGrowthUseCase,
  RangeTooLargeError,
} from '../../use-cases/admin/dashboard-user-growth.js'

const querySchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly']).optional().default('daily'),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})

export async function dashboardUserGrowthAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const query = querySchema.parse(request.query)
  const dashboardRepository = new PrismaDashboardRepository()
  const useCase = new DashboardUserGrowthUseCase(dashboardRepository)

  try {
    const result = await useCase.execute(query)
    return reply.status(200).send(result)
  } catch (error) {
    if (error instanceof RangeTooLargeError) {
      return reply.status(400).send({ message: error.message })
    }
    throw error
  }
}
