import type { FastifyReply, FastifyRequest } from 'fastify'
import type Stripe from 'stripe'
import { prisma } from '../../../lib/prisma.js'
import { stripe } from '../../../lib/stripe.js'

/**
 * Retorna a assinatura atual do usuário e seu uso
 */
export async function getSubscription(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const userId = request.user.sub

    // Buscar usuário para pegar stripeCustomerId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    })

    // Buscar assinatura ativa no banco local
    let subscription = await prisma.subscription.findFirst({
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

    // Se não encontrou no banco local, tentar sincronizar do Stripe
    if (!subscription && user?.stripeCustomerId) {
      // Verificar qual ambiente do Stripe está sendo usado
      const stripeKey = process.env.STRIPE_SECRET_KEY || ''
      const isLiveMode = stripeKey.startsWith('sk_live_')

      try {
        // Buscar subscriptions ativas no Stripe (incluindo trialing)
        const stripeSubscriptions = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: 'all', // Buscar todas para incluir trialing
          limit: 10, // Aumentar para ver todas
        })

        // Filtrar apenas subscriptions ativas ou em trial
        const activeOrTrialingSubs = stripeSubscriptions.data.filter(
          (sub) => sub.status === 'active' || sub.status === 'trialing',
        )

        if (activeOrTrialingSubs.length > 0) {
          // Pegar a subscription mais recente
          const sortedSubs = activeOrTrialingSubs.sort(
            (a, b) => b.created - a.created,
          )
          const latestSubscriptionId = sortedSubs[0]?.id

          if (!latestSubscriptionId) {
            console.error(
              '❌ [get-subscription] Subscription ID não encontrado',
            )
            throw new Error('Subscription ID not found')
          }

          // Buscar subscription completa do Stripe para ter todos os dados
          const retrievedSubscription =
            await stripe.subscriptions.retrieve(latestSubscriptionId)
          const stripeSubscription =
            retrievedSubscription as unknown as Stripe.Subscription & {
              current_period_end?: number
              items?: {
                data?: Array<{
                  current_period_end?: number
                }>
              }
            }

          // Tentar obter current_period_end de diferentes lugares
          // Para subscriptions em trial, usar trial_end se disponível
          const stripeSubWithTrial = stripeSubscription as Stripe.Subscription & {
            trial_end?: number
          }

          let currentPeriodEnd: number | undefined =
            stripeSubscription.current_period_end

          // Se está em trial e tem trial_end, usar trial_end
          if (
            stripeSubscription.status === 'trialing' &&
            stripeSubWithTrial.trial_end
          ) {
            currentPeriodEnd = stripeSubWithTrial.trial_end
          }

          if (!currentPeriodEnd) {
            // Tentar pegar do subscription item (para billing_mode: flexible)
            const firstItem = stripeSubscription.items?.data?.[0]
            const itemPeriodEnd = (
              firstItem as { current_period_end?: number } | undefined
            )?.current_period_end

            if (itemPeriodEnd && typeof itemPeriodEnd === 'number') {
              currentPeriodEnd = itemPeriodEnd
            } else if (
              stripeSubscription.billing_cycle_anchor &&
              stripeSubscription.items?.data?.[0]?.price?.recurring?.interval
            ) {
              // Calcular a partir de billing_cycle_anchor + intervalo
              const interval =
                stripeSubscription.items.data[0].price.recurring.interval
              const anchor = stripeSubscription.billing_cycle_anchor
              const intervalSeconds =
                interval === 'month'
                  ? 30 * 24 * 60 * 60
                  : interval === 'year'
                    ? 365 * 24 * 60 * 60
                    : interval === 'week'
                      ? 7 * 24 * 60 * 60
                      : 24 * 60 * 60 // day
              currentPeriodEnd = anchor + intervalSeconds
            }
          }

          if (!currentPeriodEnd || typeof currentPeriodEnd !== 'number') {
            console.error(
              '❌ [get-subscription] current_period_end inválido:',
              currentPeriodEnd,
            )
            console.error('   Subscription:', stripeSubscription.id)
            console.error('   Tentou buscar de:', {
              subscriptionRoot: stripeSubscription.current_period_end,
              subscriptionItem:
                stripeSubscription.items?.data?.[0]?.current_period_end,
              billingCycleAnchor: stripeSubscription.billing_cycle_anchor,
            })
            throw new Error(
              'Invalid current_period_end from Stripe subscription',
            )
          }

          const currentPeriodEndDate = new Date(currentPeriodEnd * 1000)
          if (Number.isNaN(currentPeriodEndDate.getTime())) {
            console.error(
              '❌ [get-subscription] Erro ao criar data do current_period_end',
            )
            console.error('   Valor:', currentPeriodEnd)
            console.error('   Timestamp:', currentPeriodEnd * 1000)
            throw new Error('Invalid time value for current_period_end')
          }

          // Buscar plano pelo stripePriceId
          const priceId = stripeSubscription.items.data[0]?.price?.id
          if (priceId) {
            const plan = await prisma.plan.findFirst({
              where: { stripePriceId: priceId },
            })

            if (plan) {
              // Criar subscription no banco local
              // currentPeriodEnd já foi validado acima
              const currentPeriodEnd = currentPeriodEndDate

              subscription = await prisma.subscription.create({
                data: {
                  userId,
                  planId: plan.id,
                  status:
                    stripeSubscription.status === 'active' ||
                    stripeSubscription.status === 'trialing'
                      ? 'active'
                      : 'canceled',
                  currentPeriodEnd,
                  stripeSubscriptionId: stripeSubscription.id,
                },
                include: {
                  plan: true,
                },
              })
            } else {
              const allPlans = await prisma.plan.findMany({
                select: { name: true, stripePriceId: true },
              })
            }

          }
        }
      } catch (stripeError) {
        const error = stripeError as {
          type?: string
          code?: string
          message?: string
        }
        console.error('❌ [get-subscription] Erro ao buscar do Stripe:', {
          type: error.type,
          code: error.code,
          message: error.message,
        })
      }
    }

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
