import type { FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '../../lib/prisma.js'

export async function checkUsage(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const userId = request.user.sub

    // Buscar assinatura ativa do usuário
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'active',
        currentPeriodEnd: {
          gte: new Date(), // Ainda não expirou
        },
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Se não tem assinatura ativa, usar plano FREE
    let plan = subscription?.plan

    if (!plan) {
      plan = await prisma.plan.findUnique({
        where: { name: 'FREE' },
      })

      if (!plan) {
        console.error('FREE plan not found in database')
        return reply.status(500).send({
          message: 'Service configuration error',
        })
      }
    }

    // Se o plano é ilimitado, permitir
    if (plan.isUnlimited) {
      return
    }

    // Buscar ou criar registro de uso do mês atual
    const now = new Date()
    const month = now.getMonth() + 1 // getMonth() retorna 0-11
    const year = now.getFullYear()

    let usage = await prisma.usage.findUnique({
      where: {
        userId_month_year: {
          userId,
          month,
          year,
        },
      },
    })

    if (!usage) {
      usage = await prisma.usage.create({
        data: {
          userId,
          month,
          year,
          videosUsed: 0,
          matchesUsed: 0,
        },
      })
    }

    // Verificar limites de vídeos
    if (
      plan.monthlyLimitVideos !== null &&
      usage.videosUsed >= plan.monthlyLimitVideos
    ) {
      return reply.status(402).send({
        message: 'Monthly video limit reached. Please upgrade your plan.',
        limit: plan.monthlyLimitVideos,
        used: usage.videosUsed,
      })
    }

    // Verificar limites de partidas
    if (
      plan.monthlyLimitMatches !== null &&
      usage.matchesUsed >= plan.monthlyLimitMatches
    ) {
      return reply.status(402).send({
        message: 'Monthly match limit reached. Please upgrade your plan.',
        limit: plan.monthlyLimitMatches,
        used: usage.matchesUsed,
      })
    }

    // Middleware apenas verifica limites, não precisa armazenar no request
  } catch (error) {
    console.error('❌ Error checking usage:', error)
    return reply.status(500).send({
      message: 'Error checking usage limits',
    })
  }
}

