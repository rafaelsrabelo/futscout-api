import { config } from 'dotenv'
import { prisma } from '../src/lib/prisma.js'
import { stripe } from '../src/lib/stripe.js'

config()

const novoCustomerId = process.argv[2] // Recebe como argumento
const userId = 'da037682-f58f-4b0b-afba-f7ec12b9ebf8' // Seu userId

async function atualizarCustomerId() {
  if (!novoCustomerId) {
    console.error('❌ Por favor, forneça o customer ID como argumento')
    console.error('   Exemplo: tsx scripts/atualizar-customer-id.ts cus_XXXXX')
    process.exit(1)
  }

  console.log('🔄 Atualizando stripeCustomerId...\n')

  // Verificar se o customer existe no Stripe
  try {
    const customer = await stripe.customers.retrieve(novoCustomerId)
    console.log('✅ Customer encontrado no Stripe:')
    console.log(`   ID: ${customer.id}`)
    console.log(`   Email: ${customer.email}`)
    console.log(`   Livemode: ${customer.livemode ? 'PRODUÇÃO ✅' : 'TEST ❌'}\n`)
  } catch (error) {
    console.error('❌ Customer não encontrado no Stripe:', novoCustomerId)
    process.exit(1)
  }

  // Buscar usuário
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      stripeCustomerId: true,
    },
  })

  if (!user) {
    console.error('❌ Usuário não encontrado')
    process.exit(1)
  }

  console.log('👤 Usuário atual:')
  console.log(`   Email: ${user.email}`)
  console.log(`   Stripe Customer ID atual: ${user.stripeCustomerId || 'não configurado'}\n`)

  // Atualizar
  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeCustomerId: novoCustomerId,
    },
  })

  console.log('✅ stripeCustomerId atualizado com sucesso!')
  console.log(`   Novo Customer ID: ${novoCustomerId}\n`)

  // Tentar sincronizar subscription
  console.log('🔄 Tentando sincronizar subscription...\n')
  const subscriptions = await stripe.subscriptions.list({
    customer: novoCustomerId,
    status: 'all',
    limit: 10,
  })

  const activeSubs = subscriptions.data.filter(
    (sub) => sub.status === 'active' || sub.status === 'trialing',
  )

  if (activeSubs.length > 0) {
    console.log(`📦 Encontradas ${activeSubs.length} subscription(s) ativa(s)\n`)
    console.log('💡 A subscription será sincronizada automaticamente na próxima requisição')
    console.log('   ou você pode executar:')
    console.log('   tsx scripts/sincronizar-subscription-producao.ts')
  } else {
    console.log('ℹ️ Nenhuma subscription ativa encontrada')
  }
}

atualizarCustomerId().catch(console.error)

