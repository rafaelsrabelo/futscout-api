import { prisma } from '../src/lib/prisma.js'

/**
 * Script para atualizar o stripePriceId do plano PREMIUM
 * 
 * Uso:
 *   tsx scripts/update-premium-price.ts price_xxxxx
 */

async function updatePremiumPrice(priceId: string) {
  try {
    console.log('🔍 Buscando plano PREMIUM...')

    const premiumPlan = await prisma.plan.findUnique({
      where: { name: 'PREMIUM' },
    })

    if (!premiumPlan) {
      console.error('❌ Plano PREMIUM não encontrado!')
      console.log('💡 Execute primeiro: npm run db:seed ou verifique se o seedPlans() foi executado')
      process.exit(1)
    }

    console.log('✅ Plano PREMIUM encontrado:')
    console.log(`   ID: ${premiumPlan.id}`)
    console.log(`   Preço atual: R$ ${(premiumPlan.price / 100).toFixed(2)}`)
    console.log(`   Stripe Price ID atual: ${premiumPlan.stripePriceId || 'não configurado'}`)

    console.log(`\n🔄 Atualizando stripePriceId para: ${priceId}...`)

    const updated = await prisma.plan.update({
      where: { name: 'PREMIUM' },
      data: {
        stripePriceId: priceId,
      },
    })

    console.log('✅ Plano PREMIUM atualizado com sucesso!')
    console.log(`   Novo Stripe Price ID: ${updated.stripePriceId}`)
    console.log('\n🎉 Agora o checkout funcionará corretamente!')
  } catch (error) {
    console.error('❌ Erro ao atualizar plano:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Pegar Price ID dos argumentos
const priceId = process.argv[2]

if (!priceId) {
  console.error('❌ Erro: Price ID não fornecido!')
  console.log('\n📖 Como usar:')
  console.log('   tsx scripts/update-premium-price.ts price_xxxxx')
  console.log('\n💡 Como encontrar o Price ID no Stripe:')
  console.log('   1. Acesse: https://dashboard.stripe.com/test/products')
  console.log('   2. Clique no produto "Plano Premium FutScore"')
  console.log('   3. Na seção "Preços", clique no preço (R$ 29,90)')
  console.log('   4. Copie o "Price ID" (começa com price_)')
  process.exit(1)
}

if (!priceId.startsWith('price_')) {
  console.error('❌ Erro: Price ID deve começar com "price_"')
  console.log(`   Você forneceu: ${priceId}`)
  console.log('\n💡 Você forneceu o Product ID, mas precisamos do Price ID!')
  console.log('   Product ID: prod_xxxxx (identifica o produto)')
  console.log('   Price ID: price_xxxxx (identifica o preço específico)')
  process.exit(1)
}

updatePremiumPrice(priceId)

