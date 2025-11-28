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
    
    // Debug: mostrar token recebido (apenas para desenvolvimento)
    const authHeader = request.headers.authorization
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      console.log('🔑 Token recebido:', token.substring(0, 20) + '...' + token.substring(token.length - 10))
      console.log('🔑 Token completo:', token)
    }

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

    const firstDayOfMonth = new Date(year, month - 1, 1)
    const lastDayOfMonth = new Date(year, month, 0, 23, 59, 59, 999)

    let usage = await prisma.usage.findUnique({
      where: {
        userId_month_year: {
          userId,
          month,
          year,
        },
      },
    })

    // Se não tem registro de uso, buscar do banco diretamente
    if (!usage) {
      // Buscar perfil do atleta
      const athleteProfile = await prisma.athleteProfile.findUnique({
        where: { userId },
      })

      if (athleteProfile) {
        // Contar partidas criadas este mês
        const matchesCount = await prisma.match.count({
          where: {
            athleteId: athleteProfile.id,
            createdAt: {
              gte: firstDayOfMonth,
              lte: lastDayOfMonth,
            },
          },
        })

        // Contar vídeos em jogos criados este mês
        const videosInMatchesCount = await prisma.play.count({
          where: {
            match: {
              athleteId: athleteProfile.id,
            },
            videoUrl: { not: null },
            matchId: { not: null },
            createdAt: {
              gte: firstDayOfMonth,
              lte: lastDayOfMonth,
            },
          },
        })

        // Contar vídeos standalone criados este mês
        const standaloneVideosCount = await prisma.play.count({
          where: {
            athleteId: athleteProfile.id,
            videoUrl: { not: null },
            matchId: null,
            createdAt: {
              gte: firstDayOfMonth,
              lte: lastDayOfMonth,
            },
          },
        })

        // Criar registro de uso com os valores do banco
        usage = await prisma.usage.create({
          data: {
            userId,
            month,
            year,
            matchesUsed: matchesCount,
            videosUsed: videosInMatchesCount,
            standaloneVideosUsed: standaloneVideosCount,
          },
        })
      } else {
        // Se não tem perfil, criar com zeros
        usage = await prisma.usage.create({
          data: {
            userId,
            month,
            year,
            matchesUsed: 0,
            videosUsed: 0,
            standaloneVideosUsed: 0,
          },
        })
      }
    }

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
        monthlyLimitStandaloneVideos: plan.monthlyLimitStandaloneVideos,
        isUnlimited: plan.isUnlimited,
      },
      usage: {
        matchesUsed: usage.matchesUsed,
        videosUsed: usage.videosUsed,
        standaloneVideosUsed: usage.standaloneVideosUsed,
        month: usage.month,
        year: usage.year,
      },
    })
  } catch (error) {
    console.error('❌ Error getting subscription:', error)
    return reply.status(500).send({
      message: 'Error getting subscription',
    })
  }
}
