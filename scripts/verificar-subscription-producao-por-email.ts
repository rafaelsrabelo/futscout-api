import { config } from 'dotenv'
import { prisma } from '../src/lib/prisma.js'
import { stripe } from '../src/lib/stripe.js'

config()

const email = 'rafaelrabelodev@gmail.com' // Seu email

async function verificarSubscriptionProducao() {
  console.log('🔍 Verificando se você já tem subscription paga em PRODUÇÃO...\n')

  // Verificar ambiente do backend
  const stripeKey = process.env.STRIPE_SECRET_KEY || ''
  const isLiveMode = stripeKey.startsWith('sk_live_')
  console.log(`🌍 Backend está em: ${isLiveMode ? 'PRODUÇÃO' : 'TEST'}\n`)

  if (!isLiveMode) {
    console.log('⚠️ Backend não está em PRODUÇÃO!')
    console.log('   Mude para sk_live_... para verificar subscriptions de produção\n')
    return
  }

  // Buscar usuário por email
  const user = await prisma.user.findUnique({
    where: { email },
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
  console.log(`   ID: ${user.id}`)
  console.log(`   Email: ${user.email}`)
  console.log(`   Stripe Customer ID: ${user.stripeCustomerId || 'não configurado'}\n`)

  // Buscar TODOS os customers no Stripe com este email (produção)
  console.log('🔍 Buscando customers no Stripe (PRODUÇÃO) com este email...\n')
  const customers = await stripe.customers.list({
    email,
    limit: 100,
  })

  console.log(`📋 Encontrados ${customers.data.length} customer(s) em PRODUÇÃO:\n`)

  let temSubscriptionPaga = false
  let customerComSubscription: string | null = null

  for (const customer of customers.data) {
    console.log(`👤 Customer: ${customer.id}`)
    console.log(`   Email: ${customer.email}`)
    console.log(`   Criado em: ${new Date(customer.created * 1000).toISOString()}`)
    console.log(`   Livemode: ${customer.livemode ? 'PRODUÇÃO ✅' : 'TEST ❌'}\n`)

    // Buscar subscriptions deste customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 10,
    })

    const activeSubs = subscriptions.data.filter(
      (sub) => sub.status === 'active' || sub.status === 'trialing',
    )

    if (activeSubs.length > 0) {
      console.log(`   📦 ${activeSubs.length} subscription(s) ativa(s) encontrada(s):`)
      for (const sub of activeSubs) {
        const priceId = sub.items.data[0]?.price?.id
        console.log(`      - ${sub.id} (${sub.status})`)
        console.log(`        Price ID: ${priceId || 'N/A'}`)
        console.log(
          `        Criada em: ${new Date(sub.created * 1000).toISOString()}`,
        )

        // Verificar se foi paga
        try {
          const invoices = await stripe.invoices.list({
            subscription: sub.id,
            limit: 1,
          })
          if (invoices.data.length > 0) {
            const invoice = invoices.data[0]
            const valorFatura = (invoice.amount_paid / 100).toFixed(2)
            console.log(
              `        Última fatura: ${invoice.status} - R$ ${valorFatura}`,
            )
            if (invoice.status === 'paid') {
              temSubscriptionPaga = true
              customerComSubscription = customer.id
              console.log('        ✅ SUBSCRIPTION PAGA ENCONTRADA!')
            }
          }
        } catch (err) {
          console.log('        ⚠️ Erro ao verificar faturas')
        }
      }
      console.log('')
    } else {
      console.log('   ℹ️ Nenhuma subscription ativa\n')
    }
  }

  const separator = '='.repeat(60)
  console.log(`\n${separator}\n`)

  if (temSubscriptionPaga && customerComSubscription) {
    console.log('✅ BOA NOTÍCIA!')
    console.log('   Você já tem uma subscription PAGA em PRODUÇÃO!')
    console.log(`   Customer ID: ${customerComSubscription}\n`)
    console.log('💡 Solução SEM pagar de novo:')
    console.log('   1. Atualizar o stripeCustomerId do usuário para:', customerComSubscription)
    console.log('   2. Sincronizar a subscription')
    console.log('   3. Pronto! Não precisa pagar de novo!\n')
    console.log('📝 Execute:')
    console.log(`   tsx scripts/atualizar-customer-id.ts ${customerComSubscription}`)
  } else {
    console.log('ℹ️ Nenhuma subscription paga encontrada em PRODUÇÃO')
    console.log('\n💡 Opções:')
    console.log('   1. Fazer um novo checkout (vai criar novo customer e subscription em PRODUÇÃO)')
    console.log('   2. Se você pagou em TESTE, precisará pagar novamente em PRODUÇÃO')
  }
}

verificarSubscriptionProducao().catch(console.error)

