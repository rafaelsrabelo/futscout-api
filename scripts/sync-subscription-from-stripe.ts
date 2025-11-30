/**
 * Script para sincronizar subscription do Stripe para o banco local
 * Útil quando você comprou em produção mas está testando localmente
 * 
 * Uso:
 *   tsx scripts/sync-subscription-from-stripe.ts <userId> [stripeCustomerId]
 */

import { prisma } from '../src/lib/prisma.js'
import { stripe } from '../src/lib/stripe.js'

async function syncSubscription(userId: string, stripeCustomerId?: string) {
  try {
    console.log('🔄 Sincronizando subscription do Stripe...\n')

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true,
        email: true,
        name: true,
        stripeCustomerId: true,
      },
    })

    if (!user) {
      console.error(`❌ Usuário não encontrado: ${userId}`)
      process.exit(1)
    }

    const customerId = stripeCustomerId || user.stripeCustomerId

    if (!customerId) {
      console.error('❌ Usuário não tem stripeCustomerId configurado')
      console.error('💡 Você pode passar o customerId como segundo argumento:')
      console.error(`   tsx scripts/sync-subscription-from-stripe.ts ${userId} cus_xxxxx\n`)
      process.exit(1)
    }

    console.log('👤 Usuário:', {
      id: user.id,
      email: user.email,
      name: user.name,
      stripeCustomerId: customerId,
    })

    // Verificar ambiente do Stripe
    const stripeKey = process.env.STRIPE_SECRET_KEY || ''
    const isLiveMode = stripeKey.startsWith('sk_live_')
    console.log(`\n🌍 Ambiente Stripe: ${isLiveMode ? 'PRODUÇÃO' : 'TEST'}`)

    // Buscar subscriptions no Stripe
    console.log('\n🔍 Buscando subscriptions no Stripe...')
    const stripeSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all', // Buscar todas (active, canceled, etc)
      limit: 10,
    })

    console.log(`📋 Encontradas ${stripeSubscriptions.data.length} subscription(s)\n`)

    if (stripeSubscriptions.data.length === 0) {
      console.log('ℹ️ Nenhuma subscription encontrada no Stripe')
      process.exit(0)
    }

    // Processar cada subscription
    for (const stripeSubscription of stripeSubscriptions.data) {
      console.log(`\n📦 Processando subscription: ${stripeSubscription.id}`)
      console.log(`   Status: ${stripeSubscription.status}`)
      console.log(`   Ambiente: ${stripeSubscription.livemode ? 'PRODUÇÃO' : 'TEST'}`)
      console.log(`   Criada em: ${new Date(stripeSubscription.created * 1000).toISOString()}`)
      
      // Verificar ambiente
      if (isLiveMode && !stripeSubscription.livemode) {
        console.warn('   ⚠️ ATENÇÃO: Subscription está em TEST mas você está usando chave de PRODUÇÃO!')
      } else if (!isLiveMode && stripeSubscription.livemode) {
        console.warn('   ⚠️ ATENÇÃO: Subscription está em PRODUÇÃO mas você está usando chave de TEST!')
        console.warn('   💡 Use sk_live_... no .env para buscar subscriptions de produção')
      }

      // Buscar plano pelo priceId
      const priceId = stripeSubscription.items.data[0]?.price?.id
      if (!priceId) {
        console.error('   ❌ PriceId não encontrado na subscription')
        continue
      }

      console.log(`   Price ID: ${priceId}`)

      const plan = await prisma.plan.findFirst({
        where: { stripePriceId: priceId },
      })

      if (!plan) {
        console.error(`   ❌ Plano não encontrado para priceId: ${priceId}`)
        console.error('   💡 Verifique se o stripePriceId do plano está correto no banco')
        continue
      }

      console.log(`   ✅ Plano encontrado: ${plan.name}`)

      // Criar ou atualizar subscription no banco
      const currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000)
      const status = stripeSubscription.status === 'active' 
        ? 'active' 
        : stripeSubscription.status === 'past_due'
          ? 'past_due'
          : 'canceled'

      const existingSubscription = await prisma.subscription.findFirst({
        where: {
          OR: [
            { stripeSubscriptionId: stripeSubscription.id },
            { userId: user.id },
          ],
        },
      })

      if (existingSubscription) {
        await prisma.subscription.update({
          where: { id: existingSubscription.id },
          data: {
            planId: plan.id,
            status,
            currentPeriodEnd,
            stripeSubscriptionId: stripeSubscription.id,
          },
        })
        console.log(`   ✅ Subscription atualizada no banco: ${existingSubscription.id}`)
      } else {
        const newSubscription = await prisma.subscription.create({
          data: {
            userId: user.id,
            planId: plan.id,
            status,
            currentPeriodEnd,
            stripeSubscriptionId: stripeSubscription.id,
          },
        })
        console.log(`   ✅ Subscription criada no banco: ${newSubscription.id}`)
      }
    }

    console.log('\n✅ Sincronização concluída!')
  } catch (error: any) {
    console.error('\n❌ Erro ao sincronizar:', {
      type: error.type,
      code: error.code,
      message: error.message,
    })
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar
const userId = process.argv[2]
const stripeCustomerId = process.argv[3]

if (!userId) {
  console.error('❌ Uso: tsx scripts/sync-subscription-from-stripe.ts <userId> [stripeCustomerId]')
  console.error('\nExemplo:')
  console.error('  tsx scripts/sync-subscription-from-stripe.ts 123e4567-e89b-12d3-a456-426614174000')
  console.error('  tsx scripts/sync-subscription-from-stripe.ts 123e4567-e89b-12d3-a456-426614174000 cus_xxxxx')
  process.exit(1)
}

syncSubscription(userId, stripeCustomerId)

