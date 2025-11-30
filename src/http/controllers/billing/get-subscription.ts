import type { FastifyReply, FastifyRequest } from 'fastify'
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
    
    console.log('🔍 [get-subscription] Buscando subscription para userId:', userId)

    // Buscar usuário para pegar stripeCustomerId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    })

    console.log('👤 [get-subscription] Usuário encontrado:', {
      userId,
      stripeCustomerId: user?.stripeCustomerId || 'não configurado',
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

    console.log('📦 [get-subscription] Subscription no banco local:', subscription ? {
      id: subscription.id,
      status: subscription.status,
      planName: subscription.plan.name,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
    } : 'não encontrada')

    // Se não encontrou no banco local, tentar sincronizar do Stripe
    if (!subscription && user?.stripeCustomerId) {
      console.log('🔄 [get-subscription] Subscription não encontrada no banco, tentando sincronizar do Stripe...')
      console.log('🔑 [get-subscription] Stripe Customer ID:', user.stripeCustomerId)
      
      // Verificar qual ambiente do Stripe está sendo usado
      const stripeKey = process.env.STRIPE_SECRET_KEY || ''
      const isLiveMode = stripeKey.startsWith('sk_live_')
      console.log(`🌍 [get-subscription] Ambiente Stripe: ${isLiveMode ? 'PRODUÇÃO' : 'TEST'}`)
      
      try {
        // Buscar subscriptions ativas no Stripe
        const stripeSubscriptions = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: 'active',
          limit: 10, // Aumentar para ver todas
        })
        
        console.log(`📋 [get-subscription] Encontradas ${stripeSubscriptions.data.length} subscription(s) no Stripe`)

        if (stripeSubscriptions.data.length > 0) {
          // Pegar a subscription mais recente
          const stripeSubscription = stripeSubscriptions.data.sort(
            (a, b) => b.created - a.created
          )[0]
          
          console.log('✅ [get-subscription] Subscription encontrada no Stripe:', {
            id: stripeSubscription.id,
            status: stripeSubscription.status,
            priceId: stripeSubscription.items.data[0]?.price?.id,
            livemode: stripeSubscription.livemode,
            created: new Date(stripeSubscription.created * 1000).toISOString(),
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
          })
          
          // Verificar se o ambiente está correto
          if (isLiveMode && !stripeSubscription.livemode) {
            console.warn('⚠️ [get-subscription] ATENÇÃO: Subscription está em TEST mode mas você está usando chave de PRODUÇÃO!')
          } else if (!isLiveMode && stripeSubscription.livemode) {
            console.warn('⚠️ [get-subscription] ATENÇÃO: Subscription está em PRODUÇÃO mas você está usando chave de TEST!')
            console.warn('⚠️ [get-subscription] Use sk_live_... no .env para buscar subscriptions de produção')
          }

          // Buscar plano pelo stripePriceId
          const priceId = stripeSubscription.items.data[0]?.price?.id
          if (priceId) {
            const plan = await prisma.plan.findFirst({
              where: { stripePriceId: priceId },
            })

            if (plan) {
              console.log('✅ [get-subscription] Plano encontrado:', plan.name)
              
              // Criar subscription no banco local
              const currentPeriodEnd = new Date(
                stripeSubscription.current_period_end * 1000,
              )
              
              subscription = await prisma.subscription.create({
                data: {
                  userId,
                  planId: plan.id,
                  status: 'active',
                  currentPeriodEnd,
                  stripeSubscriptionId: stripeSubscription.id,
                },
                include: {
                  plan: true,
                },
              })
              
              console.log('✅ [get-subscription] Subscription criada no banco local:', {
                id: subscription.id,
                planName: subscription.plan.name,
              })
            } else {
              console.error('❌ [get-subscription] Plano não encontrado para priceId:', priceId)
            }
          } else {
            console.error('❌ [get-subscription] PriceId não encontrado na subscription do Stripe')
          }
        } else {
          console.log('ℹ️ [get-subscription] Nenhuma subscription ativa encontrada no Stripe')
          console.log('💡 [get-subscription] Possíveis causas:')
          console.log('   1. Subscription foi cancelada')
          console.log('   2. Customer ID está incorreto')
          console.log('   3. Ambiente do Stripe não corresponde (test vs production)')
        }
      } catch (stripeError) {
        const error = stripeError as { type?: string; code?: string; message?: string }
        console.error('❌ [get-subscription] Erro ao buscar do Stripe:', {
          type: error.type,
          code: error.code,
          message: error.message,
        })
        
        if (stripeError.code === 'resource_missing') {
          console.error('💡 [get-subscription] Customer não encontrado no Stripe. Verifique:')
          console.error('   1. Se o stripeCustomerId está correto no banco')
          console.error('   2. Se está usando a chave correta do Stripe (test vs production)')
        }
      }
    } else if (!user?.stripeCustomerId) {
      console.log('⚠️ [get-subscription] Usuário não tem stripeCustomerId configurado')
      console.log('💡 [get-subscription] Isso significa que o usuário nunca fez checkout ou o customer não foi salvo')
    }

    // Se não tem assinatura ativa, retornar plano FREE
    let plan = subscription?.plan ?? null
    if (!plan) {
      console.log('ℹ️ [get-subscription] Nenhuma subscription ativa encontrada, usando plano FREE')
      plan = await prisma.plan.findUnique({
        where: { name: 'FREE' },
      })
    } else {
      console.log('✅ [get-subscription] Usando plano:', plan.name)
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
