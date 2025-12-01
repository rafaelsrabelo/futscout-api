/**
 * Script rápido para sincronizar subscription do Stripe AGORA
 * 
 * Uso:
 *   tsx scripts/sincronizar-agora.ts <email>
 * 
 * Exemplo:
 *   tsx scripts/sincronizar-agora.ts rafaelrabelodev@gmail.com
 */

import type Stripe from 'stripe'
import { prisma } from '../src/lib/prisma.js'
import { stripe } from '../src/lib/stripe.js'

async function sincronizarAgora(email: string) {
  try {
    console.log('🔄 Sincronizando subscription do Stripe...\n')

    // Buscar usuário por email
    const user = await prisma.user.findFirst({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        stripeCustomerId: true,
      },
    })

    if (!user) {
      console.error(`❌ Usuário não encontrado: ${email}`)
      process.exit(1)
    }

    if (!user.stripeCustomerId) {
      console.error('❌ Usuário não tem stripeCustomerId configurado')
      console.error('💡 O usuário precisa ter feito checkout pelo menos uma vez')
      process.exit(1)
    }

    console.log('👤 Usuário:', {
      id: user.id,
      email: user.email,
      name: user.name,
      stripeCustomerId: user.stripeCustomerId,
    })

    // Verificar ambiente do Stripe
    const stripeKey = process.env.STRIPE_SECRET_KEY || ''
    const isLiveMode = stripeKey.startsWith('sk_live_')
    console.log(`\n🌍 Ambiente Stripe: ${isLiveMode ? 'PRODUÇÃO' : 'TEST'}`)

    // Buscar subscriptions ativas no Stripe
    console.log('\n🔍 Buscando subscriptions ativas no Stripe...')
    const stripeSubscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'active',
      limit: 10,
    })

    console.log(
      `📋 Encontradas ${stripeSubscriptions.data.length} subscription(s) ativa(s)\n`,
    )

    if (stripeSubscriptions.data.length === 0) {
      console.log('ℹ️ Nenhuma subscription ativa encontrada no Stripe')
      console.log('💡 Verifique se você realmente completou o pagamento')
      process.exit(0)
    }

    // Pegar a subscription mais recente
    const stripeSubscription = stripeSubscriptions.data.sort(
      (a, b) => b.created - a.created,
    )[0] as Stripe.Subscription

    console.log(`📦 Subscription encontrada: ${stripeSubscription.id}`)
    console.log(`   Status: ${stripeSubscription.status}`)
    console.log(
      `   Ambiente: ${stripeSubscription.livemode ? 'PRODUÇÃO' : 'TEST'}`,
    )
    console.log(
      `   Criada em: ${new Date(stripeSubscription.created * 1000).toISOString()}`,
    )

    // Verificar ambiente
    if (isLiveMode && !stripeSubscription.livemode) {
      console.warn(
        '   ⚠️ ATENÇÃO: Subscription está em TEST mas você está usando chave de PRODUÇÃO!',
      )
    } else if (!isLiveMode && stripeSubscription.livemode) {
      console.warn(
        '   ⚠️ ATENÇÃO: Subscription está em PRODUÇÃO mas você está usando chave de TEST!',
      )
      console.warn('   💡 Use sk_live_... no .env para buscar subscriptions de produção')
    }

    // Buscar plano pelo priceId
    const priceId = stripeSubscription.items.data[0]?.price?.id
    if (!priceId) {
      console.error('   ❌ PriceId não encontrado na subscription')
      process.exit(1)
    }

    console.log(`   Price ID: ${priceId}`)

    // Listar todos os planos para debug
    const allPlans = await prisma.plan.findMany({
      select: { name: true, stripePriceId: true },
    })
    console.log('\n📋 Planos disponíveis no banco:')
    for (const p of allPlans) {
      const match = p.stripePriceId === priceId ? ' ✅ CORRESPONDÊNCIA!' : ''
      console.log(`   - ${p.name}: ${p.stripePriceId || 'não configurado'}${match}`)
    }

    const plan = await prisma.plan.findFirst({
      where: { stripePriceId: priceId },
    })

    if (!plan) {
      console.error(`\n❌ Plano não encontrado para priceId: ${priceId}`)
      console.error('💡 O priceId da subscription não corresponde a nenhum plano no banco')
      console.error('💡 Solução: Atualize o stripePriceId do plano PREMIUM no banco')
      console.error(`   Exemplo: tsx scripts/update-premium-price.ts ${priceId}`)
      process.exit(1)
    }

    console.log(`\n✅ Plano encontrado: ${plan.name}`)

    // Criar ou atualizar subscription no banco
    const currentPeriodEnd = new Date(
      stripeSubscription.current_period_end * 1000,
    )
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
      console.log(
        `\n✅ Subscription atualizada no banco: ${existingSubscription.id}`,
      )
      console.log(`   Plano: ${plan.name}`)
      console.log(`   Status: ${status}`)
      console.log(
        `   Válida até: ${currentPeriodEnd.toISOString()}`,
      )
    } else {
      const newSubscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          planId: plan.id,
          status,
          currentPeriodEnd,
          stripeSubscriptionId: stripeSubscription.id,
        },
        include: {
          plan: true,
        },
      })
      console.log(`\n✅ Subscription criada no banco: ${newSubscription.id}`)
      console.log(`   Plano: ${newSubscription.plan.name}`)
      console.log(`   Status: ${status}`)
      console.log(
        `   Válida até: ${currentPeriodEnd.toISOString()}`,
      )
    }

    console.log('\n✅ Sincronização concluída!')
    console.log('💡 Agora o frontend deve mostrar o plano PREMIUM')
  } catch (error) {
    const err = error as { type?: string; code?: string; message?: string }
    console.error('\n❌ Erro:', {
      type: err.type,
      code: err.code,
      message: err.message,
    })
    if (error instanceof Error) {
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar
const email = process.argv[2]

if (!email) {
  console.error('❌ Email não fornecido')
  console.error('Uso: tsx scripts/sincronizar-agora.ts <email>')
  console.error('Exemplo: tsx scripts/sincronizar-agora.ts rafaelrabelodev@gmail.com')
  process.exit(1)
}

sincronizarAgora(email)

