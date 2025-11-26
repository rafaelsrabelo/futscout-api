import { prisma } from '../src/lib/prisma.js'

/**
 * Script para verificar um plano pelo ID
 *
 * Uso:
 *   tsx scripts/check-plan-by-id.ts <planId>
 */

async function checkPlanById(planId: string) {
  console.log(`🔍 Verificando plano com ID: ${planId}\n`)

  try {
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    })

    if (!plan) {
      console.error('❌ Plano não encontrado com esse ID!')
      console.log('\n📋 Planos disponíveis:')
      const allPlans = await prisma.plan.findMany()
      for (const p of allPlans) {
        console.log(`   - ${p.name} (ID: ${p.id})`)
        console.log(
          `     Stripe Price ID: ${p.stripePriceId || '❌ NÃO CONFIGURADO'}`,
        )
      }
      process.exit(1)
    }

    console.log('✅ Plano encontrado:')
    console.log(`   ID: ${plan.id}`)
    console.log(`   Nome: ${plan.name}`)
    console.log(`   Preço: R$ ${(plan.price / 100).toFixed(2)}`)
    console.log(
      `   Stripe Price ID: ${plan.stripePriceId || '❌ NÃO CONFIGURADO'}\n`,
    )

    if (!plan.stripePriceId) {
      console.error(
        '❌ PROBLEMA: Este plano não tem stripePriceId configurado!',
      )
      if (plan.name === 'PREMIUM') {
        console.log('\n💡 Para corrigir:')
        console.log('   tsx scripts/update-premium-price.ts price_xxxxx')
      }
      process.exit(1)
    }

    console.log('✅ Plano está configurado corretamente!')
  } catch (error) {
    console.error('❌ Erro ao verificar plano:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

const planId = process.argv[2]

if (!planId) {
  console.error('❌ Erro: Plan ID não fornecido!')
  console.log('\n📖 Como usar:')
  console.log('   tsx scripts/check-plan-by-id.ts <planId>')
  process.exit(1)
}

checkPlanById(planId)
