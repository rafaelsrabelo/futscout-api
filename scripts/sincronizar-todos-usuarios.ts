/**
 * Script para sincronizar subscriptions de TODOS os usuários que têm stripeCustomerId
 * Útil quando você configurou o webhook mas usuários já pagaram antes
 *
 * Uso:
 *   tsx scripts/sincronizar-todos-usuarios.ts
 *
 * IMPORTANTE: Configure DATABASE_URL e STRIPE_SECRET_KEY para produção antes de executar!
 */

import type Stripe from 'stripe'
import { prisma } from '../src/lib/prisma.js'
import { stripe } from '../src/lib/stripe.js'

async function sincronizarTodosUsuarios() {
  try {
    console.log('🔄 Sincronizando subscriptions de todos os usuários...\n')

    // Verificar ambiente do Stripe
    const stripeKey = process.env.STRIPE_SECRET_KEY || ''
    const isLiveMode = stripeKey.startsWith('sk_live_')
    console.log(`🌍 Ambiente Stripe: ${isLiveMode ? 'PRODUÇÃO' : 'TEST'}\n`)

    // Buscar todos os usuários que têm stripeCustomerId
    const users = await prisma.user.findMany({
      where: {
        stripeCustomerId: {
          not: null,
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        stripeCustomerId: true,
      },
    })

    console.log(
      `👥 Encontrados ${users.length} usuário(s) com stripeCustomerId\n`,
    )

    if (users.length === 0) {
      console.log('ℹ️ Nenhum usuário com stripeCustomerId encontrado')
      process.exit(0)
    }

    let totalSincronizados = 0
    let totalErros = 0

    // Processar cada usuário
    for (const user of users) {
      if (!user.stripeCustomerId) continue

      console.log(`\n${'='.repeat(60)}`)
      console.log(`👤 Processando: ${user.email || user.name || user.id}`)
      console.log(`   Customer ID: ${user.stripeCustomerId}`)

      try {
        // Buscar subscriptions ativas no Stripe
        const stripeSubscriptions = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: 'active',
          limit: 10,
        })

        if (stripeSubscriptions.data.length === 0) {
          console.log('   ℹ️ Nenhuma subscription ativa no Stripe')
          continue
        }

        // Pegar a subscription mais recente
        const stripeSubscription = stripeSubscriptions.data.sort(
          (a, b) => b.created - a.created,
        )[0] as Stripe.Subscription

        console.log(`   📦 Subscription: ${stripeSubscription.id}`)
        console.log(`   Status: ${stripeSubscription.status}`)
        console.log(
          `   Ambiente: ${stripeSubscription.livemode ? 'PRODUÇÃO' : 'TEST'}`,
        )

        // Verificar ambiente
        if (isLiveMode && !stripeSubscription.livemode) {
          console.warn(
            '   ⚠️ ATENÇÃO: Subscription está em TEST mas você está usando chave de PRODUÇÃO!',
          )
          continue
        } else if (!isLiveMode && stripeSubscription.livemode) {
          console.warn(
            '   ⚠️ ATENÇÃO: Subscription está em PRODUÇÃO mas você está usando chave de TEST!',
          )
          continue
        }

        // Buscar plano pelo priceId
        const priceId = stripeSubscription.items.data[0]?.price?.id
        if (!priceId) {
          console.error('   ❌ PriceId não encontrado na subscription')
          totalErros++
          continue
        }

        console.log(`   Price ID: ${priceId}`)

        const plan = await prisma.plan.findFirst({
          where: { stripePriceId: priceId },
        })

        if (!plan) {
          console.error(`   ❌ Plano não encontrado para priceId: ${priceId}`)
          console.error(
            '   💡 O priceId da subscription não corresponde a nenhum plano no banco',
          )
          totalErros++
          continue
        }

        console.log(`   ✅ Plano encontrado: ${plan.name}`)

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
            `   ✅ Subscription atualizada: ${existingSubscription.id}`,
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
          console.log(`   ✅ Subscription criada: ${newSubscription.id}`)
          console.log(`      Plano: ${newSubscription.plan.name}`)
        }

        totalSincronizados++
      } catch (error) {
        const err = error as { type?: string; code?: string; message?: string }
        console.error(`   ❌ Erro ao processar usuário:`, {
          type: err.type,
          code: err.code,
          message: err.message,
        })
        totalErros++
      }
    }

    console.log(`\n${'='.repeat(60)}`)
    console.log('📊 Resumo:')
    console.log(`   ✅ Sincronizados: ${totalSincronizados}`)
    console.log(`   ❌ Erros: ${totalErros}`)
    console.log(`   📋 Total processados: ${users.length}`)
    console.log('\n✅ Sincronização concluída!')
  } catch (error) {
    const err = error as { type?: string; code?: string; message?: string }
    console.error('\n❌ Erro geral:', {
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
sincronizarTodosUsuarios()
