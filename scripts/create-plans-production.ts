import { prisma } from '../src/lib/prisma.js'

/**
 * Script para criar planos FREE e PREMIUM no banco de produção
 *
 * Uso:
 *   tsx scripts/create-plans-production.ts
 *
 * IMPORTANTE: Configure DATABASE_URL para produção antes de executar!
 */

async function createPlans() {
  console.log('🌱 Criando planos no banco...\n')

  try {
    // Verificar se planos já existem
    const existingPlans = await prisma.plan.findMany()
    console.log(`📊 Planos existentes: ${existingPlans.length}`)

    if (existingPlans.length > 0) {
      console.log('\nPlanos encontrados:')
      for (const plan of existingPlans) {
        console.log(`  - ${plan.name} (ID: ${plan.id})`)
        console.log(
          `    Stripe Price ID: ${plan.stripePriceId || 'não configurado'}`,
        )
      }
    }

    // Criar plano FREE
    const freePlan = await prisma.plan.upsert({
      where: { name: 'FREE' },
      update: {
        monthlyLimitMatches: 5,
        monthlyLimitVideos: null,
        monthlyLimitStandaloneVideos: 5,
      },
      create: {
        name: 'FREE',
        price: 0,
        currency: 'BRL',
        monthlyLimitMatches: 5,
        monthlyLimitVideos: null,
        monthlyLimitStandaloneVideos: 5,
        isUnlimited: false,
      },
    })
    console.log(`\n✅ Plano FREE: ${freePlan.id}`)

    // Criar plano PREMIUM
    // ⚠️ IMPORTANTE: Substitua pelo Price ID real do Stripe
    const STRIPE_PRICE_ID =
      process.env.STRIPE_PRICE_ID || 'price_1SXnFDLW3iRz1CdXgfDhRNsQ'

    const premiumPlan = await prisma.plan.upsert({
      where: { name: 'PREMIUM' },
      update: {
        stripePriceId: STRIPE_PRICE_ID,
      },
      create: {
        name: 'PREMIUM',
        price: 2990,
        currency: 'BRL',
        monthlyLimitMatches: null,
        monthlyLimitVideos: null,
        monthlyLimitStandaloneVideos: null,
        isUnlimited: true,
        stripePriceId: STRIPE_PRICE_ID,
      },
    })
    console.log(`✅ Plano PREMIUM: ${premiumPlan.id}`)
    console.log(`   Stripe Price ID: ${premiumPlan.stripePriceId}`)

    // Listar todos os planos
    console.log('\n📋 Planos disponíveis:')
    const allPlans = await prisma.plan.findMany({
      orderBy: { price: 'asc' },
    })

    for (const plan of allPlans) {
      console.log(`\n  ${plan.name}:`)
      console.log(`    ID: ${plan.id}`)
      console.log(`    Preço: R$ ${(plan.price / 100).toFixed(2)}`)
      console.log(
        `    Stripe Price ID: ${plan.stripePriceId || 'não configurado'}`,
      )
    }

    console.log('\n🎉 Planos criados/atualizados com sucesso!')
    console.log('\n💡 Agora você pode usar:')
    console.log('   GET /api/billing/plans')
    console.log('   Para obter os IDs dos planos')
  } catch (error) {
    console.error('❌ Erro ao criar planos:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Verificar se está apontando para produção
const dbUrl = process.env.DATABASE_URL || ''
if (!dbUrl.includes('render.com') && !dbUrl.includes('production')) {
  console.warn('⚠️  ATENÇÃO: DATABASE_URL não parece ser de produção!')
  console.warn('   Certifique-se de que está apontando para o banco correto.\n')
}

createPlans()
