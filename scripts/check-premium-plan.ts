import { prisma } from '../src/lib/prisma.js'

/**
 * Script para verificar se o plano PREMIUM tem stripePriceId configurado
 * 
 * Uso:
 *   tsx scripts/check-premium-plan.ts
 */

async function checkPremiumPlan() {
  console.log('🔍 Verificando plano PREMIUM...\n')

  try {
    const premiumPlan = await prisma.plan.findUnique({
      where: { name: 'PREMIUM' },
    })

    if (!premiumPlan) {
      console.error('❌ Plano PREMIUM não encontrado!')
      console.log('💡 Execute: npm run start:dev (para rodar seedPlans)')
      process.exit(1)
    }

    console.log('✅ Plano PREMIUM encontrado:')
    console.log(`   ID: ${premiumPlan.id}`)
    console.log(`   Nome: ${premiumPlan.name}`)
    console.log(`   Preço: R$ ${(premiumPlan.price / 100).toFixed(2)}`)
    console.log(`   Stripe Price ID: ${premiumPlan.stripePriceId || '❌ NÃO CONFIGURADO'}\n`)

    if (!premiumPlan.stripePriceId) {
      console.error('❌ PROBLEMA: O plano PREMIUM não tem stripePriceId configurado!')
      console.log('\n💡 Para corrigir:')
      console.log('   1. Obtenha o Price ID do Stripe Dashboard')
      console.log('   2. Execute: tsx scripts/update-premium-price.ts price_xxxxx')
      console.log('   Ou execute SQL:')
      console.log(`      UPDATE plans SET "stripePriceId" = 'price_xxxxx' WHERE name = 'PREMIUM';\n`)
      process.exit(1)
    }

    console.log('✅ Plano PREMIUM está configurado corretamente!')
    console.log(`   Price ID: ${premiumPlan.stripePriceId}\n`)
  } catch (error) {
    console.error('❌ Erro ao verificar plano:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

checkPremiumPlan()

