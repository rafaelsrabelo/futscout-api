import type { FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '../../../lib/prisma.js'

/**
 * Lista todos os planos disponíveis
 * Rota pública (não precisa autenticação)
 */
export async function listPlans(request: FastifyRequest, reply: FastifyReply) {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: {
        price: 'asc',
      },
    })

    return reply.status(200).send({
      plans: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        monthlyLimitMatches: plan.monthlyLimitMatches,
        monthlyLimitVideos: plan.monthlyLimitVideos,
        monthlyLimitStandaloneVideos: plan.monthlyLimitStandaloneVideos,
        isUnlimited: plan.isUnlimited,
        // Não retornar stripePriceId (informação interna)
      })),
    })
  } catch (error) {
    console.error('❌ Error listing plans:', error)
    return reply.status(500).send({
      message: 'Error listing plans',
    })
  }
}
