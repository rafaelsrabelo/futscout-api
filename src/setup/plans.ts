import { prisma } from '../lib/prisma.js'

export async function seedPlans() {
  console.log('🌱 Seeding plans...')

  // Verificar se os planos já existem
  const existingFreePlan = await prisma.plan.findUnique({
    where: { name: 'FREE' },
  })

  const existingPremiumPlan = await prisma.plan.findUnique({
    where: { name: 'PREMIUM' },
  })

  // Criar plano FREE se não existir
  if (!existingFreePlan) {
    await prisma.plan.create({
      data: {
        name: 'FREE',
        price: 0,
        currency: 'BRL',
        monthlyLimitMatches: 5, // 5 jogos por mês
        monthlyLimitVideos: null, // Vídeos dentro de jogos não têm limite (só conta)
        monthlyLimitStandaloneVideos: 5, // 5 vídeos standalone (lances sem partida)
        isUnlimited: false,
      },
    })
    console.log('✅ Plano FREE criado')
  } else {
    // Atualizar plano existente se os limites mudaram
    await prisma.plan.update({
      where: { name: 'FREE' },
      data: {
        monthlyLimitMatches: 5,
        monthlyLimitVideos: null, // Vídeos dentro de jogos não têm limite
        monthlyLimitStandaloneVideos: 5, // 5 vídeos standalone
      },
    })
    console.log('ℹ️  Plano FREE atualizado')
  }

  // Criar plano PREMIUM se não existir
  const stripePriceId = process.env.STRIPE_PRICE_ID || null

  if (!existingPremiumPlan) {
    await prisma.plan.create({
      data: {
        name: 'PREMIUM',
        price: 2990, // R$29,90 em centavos
        currency: 'BRL',
        monthlyLimitMatches: null,
        monthlyLimitVideos: null,
        monthlyLimitStandaloneVideos: null,
        isUnlimited: true,
        stripePriceId: stripePriceId ?? null,
      },
    })
    console.log('✅ Plano PREMIUM criado')
    if (stripePriceId) {
      console.log(`   Stripe Price ID: ${stripePriceId}`)
    } else {
      console.log(
        '   ⚠️  Stripe Price ID não configurado (configure STRIPE_PRICE_ID no .env)',
      )
    }
  } else {
    // Atualizar stripePriceId se foi fornecido via env
    if (stripePriceId && !existingPremiumPlan.stripePriceId) {
      await prisma.plan.update({
        where: { name: 'PREMIUM' },
        data: { stripePriceId: stripePriceId ?? null },
      })
      console.log(
        `ℹ️  Plano PREMIUM atualizado com Stripe Price ID: ${stripePriceId}`,
      )
    } else {
      console.log('ℹ️  Plano PREMIUM já existe')
      if (!existingPremiumPlan.stripePriceId) {
        console.log('   ⚠️  Stripe Price ID não configurado')
      }
    }
  }

  console.log('✅ Plans seeding completed')
}
