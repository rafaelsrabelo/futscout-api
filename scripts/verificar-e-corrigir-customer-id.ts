import { config } from 'dotenv'
import { prisma } from '../src/lib/prisma.js'
import { stripe } from '../src/lib/stripe.js'

config()

const userId = 'da037682-f58f-4b0b-afba-f7ec12b9ebf8' // Seu userId

async function verificarECorrigir() {
  console.log('🔍 Verificando ambiente e customer ID...\n')

  // Verificar ambiente do backend
  const stripeKey = process.env.STRIPE_SECRET_KEY || ''
  const isLiveMode = stripeKey.startsWith('sk_live_')
  console.log(`🌍 Backend está em: ${isLiveMode ? 'PRODUÇÃO' : 'TEST'}\n`)

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
    console.error('❌ Usuário não encontrado')
    return
  }

  console.log('👤 Usuário encontrado:')
  console.log(`   Email: ${user.email}`)
  console.log(
    `   Stripe Customer ID: ${user.stripeCustomerId || 'não configurado'}\n`,
  )

  if (!user.stripeCustomerId) {
    console.log('ℹ️ Usuário não tem stripeCustomerId')
    console.log(
      '💡 Solução: Fazer um novo checkout para criar o customer no ambiente correto',
    )
    return
  }

  // Verificar se o customer existe no ambiente atual
  try {
    const customer = await stripe.customers.retrieve(user.stripeCustomerId)

    if (customer.deleted) {
      console.log('❌ Customer foi deletado no Stripe')
      return
    }

    console.log('✅ Customer encontrado no Stripe:')
    console.log(`   ID: ${customer.id}`)
    console.log(`   Email: ${customer.email}`)
    console.log(`   Livemode: ${customer.livemode ? 'PRODUÇÃO' : 'TEST'}\n`)

    // Verificar se o ambiente corresponde
    if (isLiveMode && !customer.livemode) {
      console.log('⚠️ PROBLEMA ENCONTRADO!')
      console.log(
        '   O customer foi criado em TESTE, mas o backend está em PRODUÇÃO\n',
      )
      console.log('💡 Soluções:')
      console.log(
        '   1. Fazer um novo checkout (criará novo customer em PRODUÇÃO)',
      )
      console.log('   2. Ou mudar backend para TESTE temporariamente\n')
    } else if (!isLiveMode && customer.livemode) {
      console.log('⚠️ PROBLEMA ENCONTRADO!')
      console.log(
        '   O customer foi criado em PRODUÇÃO, mas o backend está em TESTE\n',
      )
      console.log('💡 Soluções:')
      console.log(
        '   1. Fazer um novo checkout (criará novo customer em TESTE)',
      )
      console.log('   2. Ou mudar backend para PRODUÇÃO\n')
    } else {
      console.log(
        '✅ Ambiente corresponde! Customer e backend estão no mesmo ambiente\n',
      )
    }

    // Verificar subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'all',
      limit: 10,
    })

    console.log(
      `📦 Encontradas ${subscriptions.data.length} subscription(s) no Stripe:`,
    )
    for (const sub of subscriptions.data) {
      const priceId = sub.items.data[0]?.price?.id
      const livemodeText = sub.livemode ? 'PRODUÇÃO' : 'TEST'
      console.log(`   - ${sub.id} (${sub.status}) - ${livemodeText}`)
      console.log(`     Price ID: ${priceId || 'N/A'}`)
      console.log(
        `     Criada em: ${new Date(sub.created * 1000).toISOString()}`,
      )
    }
  } catch (error: unknown) {
    const err = error as { type?: string; code?: string; message?: string }
    if (err.code === 'resource_missing') {
      console.log('❌ Customer não encontrado no Stripe!')
      console.log(`   Customer ID: ${user.stripeCustomerId}`)
      console.log(`   Erro: ${err.message}\n`)
      console.log('💡 Isso significa que:')
      if (isLiveMode) {
        console.log('   - O customer foi criado em TESTE')
        console.log('   - Mas o backend está em PRODUÇÃO')
        console.log('   - Por isso não encontra o customer\n')
      } else {
        console.log('   - O customer foi criado em PRODUÇÃO')
        console.log('   - Mas o backend está em TESTE')
        console.log('   - Por isso não encontra o customer\n')
      }
      console.log('💡 Solução:')
      console.log('   1. Limpar o stripeCustomerId do usuário (opcional)')
      console.log('   2. Fazer um novo checkout')
      console.log('   3. Isso criará um novo customer no ambiente correto\n')
    } else {
      console.error('❌ Erro ao buscar customer:', err.message)
    }
  }
}

verificarECorrigir().catch(console.error)
