import { config } from 'dotenv'
import type Stripe from 'stripe'
import { prisma } from '../src/lib/prisma.js'
import { stripe } from '../src/lib/stripe.js'

config()

const customerId = 'cus_TVHvHhqsnhbbSr' // Customer ID de produção
const userId = 'da037682-f58f-4b0b-afba-f7ec12b9ebf8' // userId do metadata

async function sincronizarSubscription() {
  console.log('🔄 Sincronizando subscription de produção...\n')
  console.log(`Customer ID: ${customerId}`)
  console.log(`User ID: ${userId}\n`)

  // Verificar ambiente
  const stripeKey = process.env.STRIPE_SECRET_KEY || ''
  const isLiveMode = stripeKey.startsWith('sk_live_')
  console.log(`🌍 Ambiente: ${isLiveMode ? 'PRODUÇÃO' : 'TEST'}\n`)

  if (!isLiveMode) {
    console.error('❌ Você está usando chaves de TEST!')
    console.error('   Use chaves de PRODUÇÃO (sk_live_...) para sincronizar subscriptions de produção.\n')
    return
  }

  try {
    // Buscar subscriptions no Stripe
    const stripeSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10,
    })

    console.log(`📋 Encontradas ${stripeSubscriptions.data.length} subscription(s) no Stripe\n`)

    // Filtrar apenas ativas ou em trial
    const activeOrTrialingSubs = stripeSubscriptions.data.filter(
      (sub) => sub.status === 'active' || sub.status === 'trialing',
    )

    if (activeOrTrialingSubs.length === 0) {
      console.log('❌ Nenhuma subscription ativa encontrada no Stripe')
      return
    }

    // Pegar a mais recente
    const sortedSubs = activeOrTrialingSubs.sort(
      (a, b) => b.created - a.created,
    )
    const latestSubscriptionId = sortedSubs[0]?.id

    if (!latestSubscriptionId) {
      console.error('❌ Subscription ID não encontrado')
      return
    }

    console.log(`📦 Subscription mais recente: ${latestSubscriptionId}\n`)

    // Buscar subscription completa
    const retrievedSubscription =
      await stripe.subscriptions.retrieve(latestSubscriptionId)
    const stripeSubscription =
      retrievedSubscription as unknown as Stripe.Subscription & {
        current_period_end?: number
        trial_end?: number
        items?: {
          data?: Array<{
            current_period_end?: number
          }>
        }
      }

    console.log('📋 Detalhes da subscription:')
    console.log(`   Status: ${stripeSubscription.status}`)
    console.log(`   Livemode: ${stripeSubscription.livemode}`)
    console.log(`   Created: ${new Date(stripeSubscription.created * 1000).toISOString()}`)

    // Obter current_period_end
    let currentPeriodEnd: number | undefined =
      stripeSubscription.current_period_end

    // Se está em trial, usar trial_end
    if (
      stripeSubscription.status === 'trialing' &&
      stripeSubscription.trial_end
    ) {
      currentPeriodEnd = stripeSubscription.trial_end
      console.log(`   Trial end: ${new Date(currentPeriodEnd * 1000).toISOString()}`)
    }

    if (!currentPeriodEnd) {
      // Tentar do subscription item
      const firstItem = stripeSubscription.items?.data?.[0]
      const itemPeriodEnd = (
        firstItem as { current_period_end?: number } | undefined
      )?.current_period_end

      if (itemPeriodEnd && typeof itemPeriodEnd === 'number') {
        currentPeriodEnd = itemPeriodEnd
      }
    }

    if (!currentPeriodEnd || typeof currentPeriodEnd !== 'number') {
      console.error('❌ current_period_end não encontrado')
      return
    }

    const currentPeriodEndDate = new Date(currentPeriodEnd * 1000)
    console.log(`   Current period end: ${currentPeriodEndDate.toISOString()}\n`)

    // Buscar priceId
    const priceId = stripeSubscription.items.data[0]?.price?.id
    if (!priceId) {
      console.error('❌ PriceId não encontrado na subscription')
      return
    }

    console.log(`💰 Price ID: ${priceId}\n`)

    // Buscar plano no banco
    const plan = await prisma.plan.findFirst({
      where: { stripePriceId: priceId },
    })

    if (!plan) {
      console.error('❌ Plano não encontrado para priceId:', priceId)
      console.error('\n💡 Price IDs disponíveis no banco:')
      const allPlans = await prisma.plan.findMany({
        select: { name: true, stripePriceId: true },
      })
      for (const p of allPlans) {
        console.error(`     - ${p.name}: ${p.stripePriceId || 'não configurado'}`)
      }
      console.error('\n💡 Solução: Atualize o stripePriceId do plano PREMIUM:')
      console.error(`   tsx scripts/update-premium-price.ts ${priceId}`)
      return
    }

    console.log(`✅ Plano encontrado: ${plan.name}\n`)

    // Verificar se já existe subscription no banco
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        OR: [
          { stripeSubscriptionId: latestSubscriptionId },
          { userId },
        ],
      },
      include: { plan: true },
    })

    if (existingSubscription) {
      console.log('📦 Subscription já existe no banco:')
      console.log(`   ID: ${existingSubscription.id}`)
      console.log(`   Plano: ${existingSubscription.plan.name}`)
      console.log(`   Status: ${existingSubscription.status}`)
      console.log(`   Current period end: ${existingSubscription.currentPeriodEnd.toISOString()}\n`)

      // Atualizar se necessário
      if (
        existingSubscription.planId !== plan.id ||
        existingSubscription.status !== 'active' ||
        existingSubscription.currentPeriodEnd.getTime() !== currentPeriodEndDate.getTime()
      ) {
        console.log('🔄 Atualizando subscription...')
        await prisma.subscription.update({
          where: { id: existingSubscription.id },
          data: {
            planId: plan.id,
            status:
              stripeSubscription.status === 'active' ||
              stripeSubscription.status === 'trialing'
                ? 'active'
                : 'canceled',
            currentPeriodEnd: currentPeriodEndDate,
            stripeSubscriptionId: latestSubscriptionId,
          },
        })
        console.log('✅ Subscription atualizada com sucesso!\n')
      } else {
        console.log('✅ Subscription já está atualizada\n')
      }
    } else {
      console.log('📝 Criando subscription no banco...')
      const newSubscription = await prisma.subscription.create({
        data: {
          userId,
          planId: plan.id,
          status:
            stripeSubscription.status === 'active' ||
            stripeSubscription.status === 'trialing'
              ? 'active'
              : 'canceled',
          currentPeriodEnd: currentPeriodEndDate,
          stripeSubscriptionId: latestSubscriptionId,
        },
        include: { plan: true },
      })
      console.log('✅ Subscription criada com sucesso!')
      console.log(`   ID: ${newSubscription.id}`)
      console.log(`   Plano: ${newSubscription.plan.name}\n`)
    }

    console.log('🎉 Sincronização concluída!')
    console.log('   Teste novamente: GET /api/billing/subscription')
  } catch (error) {
    console.error('❌ Erro ao sincronizar:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
      console.error('   Stack:', error.stack)
    }
  }
}

sincronizarSubscription().catch(console.error)

