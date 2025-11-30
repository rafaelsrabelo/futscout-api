/**
 * Script para sincronizar usuário de produção para local
 * Atualiza o stripeCustomerId e sincroniza a subscription do Stripe
 * 
 * Uso:
 *   tsx scripts/sync-user-from-production.ts <userId> <stripeCustomerId>
 *   tsx scripts/sync-user-from-production.ts <email> <stripeCustomerId>
 */

import { prisma } from '../src/lib/prisma.js'
import { stripe } from '../src/lib/stripe.js'

async function syncUserFromProduction(userIdOrEmail: string, stripeCustomerId: string) {
  try {
    console.log('🔄 Sincronizando usuário de produção para local...\n')

    // Buscar usuário por ID ou email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userIdOrEmail },
          { email: userIdOrEmail },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        stripeCustomerId: true,
      },
    })

    if (!user) {
      console.error(`❌ Usuário não encontrado: ${userIdOrEmail}`)
      process.exit(1)
    }

    console.log('👤 Usuário encontrado:', {
      id: user.id,
      email: user.email,
      name: user.name,
      stripeCustomerIdAtual: user.stripeCustomerId || 'não configurado',
    })

    // Atualizar stripeCustomerId
    if (user.stripeCustomerId !== stripeCustomerId) {
      console.log(`\n🔄 Atualizando stripeCustomerId...`)
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      })
      console.log(`✅ stripeCustomerId atualizado: ${stripeCustomerId}`)
    } else {
      console.log(`\n✅ stripeCustomerId já está correto`)
    }

    // Verificar ambiente do Stripe
    const stripeKey = process.env.STRIPE_SECRET_KEY || ''
    const isLiveMode = stripeKey.startsWith('sk_live_')
    console.log(`\n🌍 Ambiente Stripe: ${isLiveMode ? 'PRODUÇÃO' : 'TEST'}`)

    if (!isLiveMode) {
      console.warn('⚠️ Você está usando chave de TEST, mas precisa de PRODUÇÃO para buscar subscriptions de produção!')
      console.warn('💡 Configure STRIPE_SECRET_KEY=sk_live_... no .env')
    }

    // Buscar subscriptions no Stripe
    console.log('\n🔍 Buscando subscriptions no Stripe...')
    const stripeSubscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'all',
      limit: 10,
    })

    console.log(`📋 Encontradas ${stripeSubscriptions.data.length} subscription(s)\n`)

    if (stripeSubscriptions.data.length === 0) {
      console.log('ℹ️ Nenhuma subscription encontrada no Stripe')
      console.log('✅ stripeCustomerId foi atualizado, mas não há subscriptions para sincronizar')
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
        continue // Pular subscriptions de produção se estiver usando chave de test
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
      const status =
        stripeSubscription.status === 'active'
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
    console.log('\n💡 Agora você pode testar fazendo uma requisição para /api/billing/subscription')
  } catch (error) {
    const err = error as { type?: string; code?: string; message?: string }
    console.error('\n❌ Erro ao sincronizar:', {
      type: err.type,
      code: err.code,
      message: err.message,
    })
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar
const userIdOrEmail = process.argv[2]
const stripeCustomerId = process.argv[3]

if (!userIdOrEmail || !stripeCustomerId) {
  console.error('❌ Uso: tsx scripts/sync-user-from-production.ts <userId|email> <stripeCustomerId>')
  console.error('\nExemplos:')
  console.error('  tsx scripts/sync-user-from-production.ts rafaelrabelodev@gmail.com cus_TVHvHhqsnhbbSr')
  console.error('  tsx scripts/sync-user-from-production.ts 123e4567-e89b-12d3-a456-426614174000 cus_TVHvHhqsnhbbSr')
  process.exit(1)
}

syncUserFromProduction(userIdOrEmail, stripeCustomerId)

