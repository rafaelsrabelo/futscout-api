import { config } from 'dotenv'
import { prisma } from '../src/lib/prisma.js'

config()

async function verificarPriceId() {
  console.log('🔍 Verificando priceId do plano PREMIUM no banco...\n')

  const premiumPlan = await prisma.plan.findFirst({
    where: { name: 'PREMIUM' },
    select: {
      id: true,
      name: true,
      stripePriceId: true,
      price: true,
    },
  })

  if (!premiumPlan) {
    console.error('❌ Plano PREMIUM não encontrado no banco!')
    return
  }

  console.log('📦 Plano PREMIUM no banco:')
  console.log(`   ID: ${premiumPlan.id}`)
  console.log(`   Nome: ${premiumPlan.name}`)
  console.log(`   Preço: R$ ${(premiumPlan.price / 100).toFixed(2)}`)
  console.log(`   Stripe Price ID: ${premiumPlan.stripePriceId || 'NÃO CONFIGURADO'}\n`)

  const priceIdStripe = 'price_1SYH7YLW3iRz1CdXEC0dOqOd'
  console.log(`🔍 Price ID da subscription no Stripe: ${priceIdStripe}\n`)

  if (premiumPlan.stripePriceId === priceIdStripe) {
    console.log('✅ CORRESPONDÊNCIA ENCONTRADA!')
    console.log('   O priceId do Stripe corresponde ao plano PREMIUM no banco.\n')
    console.log('💡 Se ainda retorna FREE, pode ser:')
    console.log('   1. Webhook não foi processado')
    console.log('   2. Sincronização automática falhou')
    console.log('   3. Subscription não está sendo encontrada no Stripe\n')
  } else {
    console.log('❌ CORRESPONDÊNCIA NÃO ENCONTRADA!')
    console.log('   O priceId do Stripe NÃO corresponde ao plano PREMIUM no banco.\n')
    console.log('💡 Solução: Atualize o stripePriceId do plano PREMIUM:')
    console.log(`   tsx scripts/update-premium-price.ts ${priceIdStripe}\n`)
  }

  // Listar todos os planos para referência
  const allPlans = await prisma.plan.findMany({
    select: {
      name: true,
      stripePriceId: true,
    },
  })

  console.log('📋 Todos os planos no banco:')
  for (const plan of allPlans) {
    console.log(`   - ${plan.name}: ${plan.stripePriceId || 'não configurado'}`)
  }
}

verificarPriceId().catch(console.error)

