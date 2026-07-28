import type { FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '../../lib/prisma.js'

/**
 * Limite mensal de mensagens do chat de busca (IAFutscore).
 *
 * Vive separado do `check-usage` de propósito: lá os blocos de partidas e
 * vídeos estão comentados, e reativar aqui não pode ligar aqueles de carona.
 * Diferente do `check-usage`, este NÃO cria a linha de Usage — quem grava é o
 * `incrementAiMessageUsage`, depois do turno dar certo.
 */
export async function checkAiUsage(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const userId = request.user.sub

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

    let plan = subscription?.plan

    if (!plan) {
      const freePlan = await prisma.plan.findUnique({
        where: { name: 'FREE' },
      })

      if (!freePlan) {
        console.error('FREE plan not found in database')
        return reply.status(500).send({
          message: 'Service configuration error',
        })
      }

      plan = freePlan
    }

    // Plano ilimitado, ou limite nulo (PREMIUM) — sem teto de mensagens.
    if (plan.isUnlimited || plan.monthlyLimitAiMessages === null) {
      return
    }

    const now = new Date()
    const usage = await prisma.usage.findUnique({
      where: {
        userId_month_year: {
          userId,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        },
      },
    })

    const used = usage?.aiMessagesUsed ?? 0

    if (used >= plan.monthlyLimitAiMessages) {
      return reply.status(402).send({
        message:
          'Você atingiu o limite mensal de mensagens no chat de busca. Faça upgrade do seu plano para continuar.',
        limit: plan.monthlyLimitAiMessages,
        used,
        planName: plan.name,
      })
    }
  } catch (error) {
    console.error('❌ Error checking AI chat usage:', error)
    return reply.status(500).send({
      message: 'Error checking usage limits',
    })
  }
}
