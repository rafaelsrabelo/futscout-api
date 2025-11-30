/**
 * Script para verificar e sincronizar subscription de um usuário específico
 * 
 * Uso:
 *   tsx scripts/check-user-subscription.ts <email|userId>
 */

import { prisma } from '../src/lib/prisma.js'
import { stripe } from '../src/lib/stripe.js'

async function checkUserSubscription(userIdOrEmail: string) {
  try {
    console.log('🔍 Verificando subscription do usuário...\n')

    // Buscar usuário
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userIdOrEmail },
          { email: userIdOrEmail },
        ],
      },
      include: {
        subscriptions: {
          include: {
            plan: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!user) {
      console.error(`❌ Usuário não encontrado: ${userIdOrEmail}`)
      process.exit(1)
    }

    console.log('👤 Usuário encontrado:')
    console.log(`   ID: ${user.id}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Nome: ${user.name}`)
    console.log(`   Stripe Customer ID: ${user.stripeCustomerId || 'não configurado'}\n`)

    // Verificar subscriptions no banco
    console.log('📦 Subscriptions no banco:')
    if (user.subscriptions.length === 0) {
      console.log('   ❌ Nenhuma subscription encontrada no banco\n')
    } else {
      for (const sub of user.subscriptions) {
        console.log(`   - ID: ${sub.id}`)
        console.log(`     Status: ${sub.status}`)
        console.log(`     Plano: ${sub.plan.name}`)
        console.log(`     Stripe Subscription ID: ${sub.stripeSubscriptionId || 'não configurado'}`)
        console.log(`     Current Period End: ${sub.currentPeriodEnd.toISOString()}`)
        console.log(`     Criada em: ${sub.createdAt.toISOString()}\n`)
      }
    }

    // Verificar no Stripe
    if (!user.stripeCustomerId) {
      console.log('⚠️ Usuário não tem stripeCustomerId, não é possível buscar no Stripe')
      process.exit(0)
    }

    console.log('🔍 Buscando subscriptions no Stripe...')
    const stripeKey = process.env.STRIPE_SECRET_KEY || ''
    const isLiveMode = stripeKey.startsWith('sk_live_')
    console.log(`🌍 Ambiente Stripe: ${isLiveMode ? 'PRODUÇÃO' : 'TEST'}\n`)

    const stripeSubscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'all',
      limit: 10,
    })

    console.log(`📋 Encontradas ${stripeSubscriptions.data.length} subscription(s) no Stripe\n`)

    if (stripeSubscriptions.data.length === 0) {
      console.log('ℹ️ Nenhuma subscription encontrada no Stripe')
      process.exit(0)
    }

    // Mostrar subscriptions do Stripe
    for (const stripeSub of stripeSubscriptions.data) {
      console.log(`📦 Subscription do Stripe:`)
      console.log(`   ID: ${stripeSub.id}`)
      console.log(`   Status: ${stripeSub.status}`)
      console.log(`   Ambiente: ${stripeSub.livemode ? 'PRODUÇÃO' : 'TEST'}`)
      console.log(`   Price ID: ${stripeSub.items.data[0]?.price?.id || 'não encontrado'}`)
      console.log(`   Current Period End: ${stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000).toISOString() : 'não configurado'}`)
      console.log(`   Criada em: ${new Date(stripeSub.created * 1000).toISOString()}`)

      // Verificar se está no banco
      const inDb = user.subscriptions.find(
        s => s.stripeSubscriptionId === stripeSub.id
      )

      if (inDb) {
        console.log(`   ✅ Já está no banco (ID: ${inDb.id})`)
      } else {
        console.log(`   ❌ NÃO está no banco - precisa sincronizar!`)

        // Tentar sincronizar
        const priceId = stripeSub.items.data[0]?.price?.id
        if (priceId) {
          const plan = await prisma.plan.findFirst({
            where: { stripePriceId: priceId },
          })

          if (plan) {
            console.log(`   🔄 Sincronizando...`)
            const currentPeriodEnd = stripeSub.current_period_end
              ? new Date(stripeSub.current_period_end * 1000)
              : new Date()

            const status =
              stripeSub.status === 'active'
                ? 'active'
                : stripeSub.status === 'past_due'
                  ? 'past_due'
                  : 'canceled'

            const newSub = await prisma.subscription.create({
              data: {
                userId: user.id,
                planId: plan.id,
                status,
                currentPeriodEnd,
                stripeSubscriptionId: stripeSub.id,
              },
              include: {
                plan: true,
              },
            })

            console.log(`   ✅ Subscription criada no banco: ${newSub.id}`)
            console.log(`      Plano: ${newSub.plan.name}`)
          } else {
            console.log(`   ❌ Plano não encontrado para priceId: ${priceId}`)
          }
        } else {
          console.log(`   ❌ Price ID não encontrado na subscription`)
        }
      }
      console.log('')
    }

    console.log('✅ Verificação concluída!')
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
const userIdOrEmail = process.argv[2]

if (!userIdOrEmail) {
  console.error('❌ Uso: tsx scripts/check-user-subscription.ts <email|userId>')
  console.error('\nExemplos:')
  console.error('  tsx scripts/check-user-subscription.ts rafaelrabelodev@gmail.com')
  console.error('  tsx scripts/check-user-subscription.ts da037682-f58f-4b0b-afba-f7ec12b9ebf8')
  process.exit(1)
}

checkUserSubscription(userIdOrEmail)

