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
          standaloneVideosUsed: 0,
          matchesUsed: 0,
        },
      })
    }

    // Detectar tipo de rota para aplicar limite correto
    const route = request.url.split('?')[0] // Remove query params
    // Rotas standalone: /plays, /plays/with-url, /plays/direct-upload, /videos/upload-url
    // NÃO standalone: /matches/:id/plays (vídeos dentro de jogos)
    const isStandaloneVideoRoute =
      (route.includes('/plays') && !route.includes('/matches/')) ||
      route.includes('/videos/upload-url')

    // Verificar limites de vídeos standalone (lances sem partida)
    if (isStandaloneVideoRoute) {
      if (
        plan.monthlyLimitStandaloneVideos !== null &&
        usage.standaloneVideosUsed >= plan.monthlyLimitStandaloneVideos
      ) {
        return reply.status(402).send({
          message:
            'Você atingiu o limite mensal de vídeos standalone. Faça upgrade do seu plano para continuar.',
          limit: plan.monthlyLimitStandaloneVideos,
          used: usage.standaloneVideosUsed,
          planName: plan.name,
        })
      }
    }

    // Verificar limites de vídeos dentro de jogos (não limitado no FREE, só conta)
    // Este limite só se aplica se monthlyLimitVideos não for null
    if (
      !isStandaloneVideoRoute &&
      plan.monthlyLimitVideos !== null &&
      usage.videosUsed >= plan.monthlyLimitVideos
    ) {
      return reply.status(402).send({
        message:
          'Você atingiu o limite mensal de vídeos em partidas. Faça upgrade do seu plano para continuar.',
        limit: plan.monthlyLimitVideos,
        used: usage.videosUsed,
        planName: plan.name,
      })
    }

    // Verificar limites de partidas
    if (
      plan.monthlyLimitMatches !== null &&
      usage.matchesUsed >= plan.monthlyLimitMatches
    ) {
      return reply.status(402).send({
        message:
          'Você atingiu o limite mensal de partidas. Faça upgrade do seu plano para continuar.',
        limit: plan.monthlyLimitMatches,
        used: usage.matchesUsed,
        planName: plan.name,
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

