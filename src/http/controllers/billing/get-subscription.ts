import type { FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '../../../lib/prisma.js'

/**
 * Retorna a assinatura atual do usuário e seu uso
 */
export async function getSubscription(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const userId = request.user.sub

    // Buscar assinatura ativa
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'active',
        currentPeriodEnd: {
          gte: new Date(),
        },
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Se não tem assinatura ativa, retornar plano FREE
    let plan = subscription?.plan ?? null
    if (!plan) {
      plan = await prisma.plan.findUnique({
        where: { name: 'FREE' },
      })
    }

    if (!plan) {
      return reply.status(500).send({
        message: 'Service configuration error',
      })
    }

    // Buscar uso do mês atual
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    const usage = await prisma.usage.findUnique({
      where: {
        userId_month_year: {
          userId,
          month,
          year,
        },
      },
    })

    return reply.status(200).send({
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
            createdAt: subscription.createdAt,
          }
        : null,
      plan: {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        monthlyLimitMatches: plan.monthlyLimitMatches,
        monthlyLimitVideos: plan.monthlyLimitVideos,
        isUnlimited: plan.isUnlimited,
      },
      usage: usage
        ? {
            matchesUsed: usage.matchesUsed,
            videosUsed: usage.videosUsed,
            month: usage.month,
            year: usage.year,
          }
        : {
            matchesUsed: 0,
            videosUsed: 0,
            month,
            year,
          },
    })
  } catch (error) {
    console.error('❌ Error getting subscription:', error)
    return reply.status(500).send({
      message: 'Error getting subscription',
    })
  }
}
