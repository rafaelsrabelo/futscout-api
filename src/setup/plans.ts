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
        monthlyLimitVideos: 25, // 5 vídeos por jogo × 5 jogos = 25 vídeos
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
        monthlyLimitVideos: 25,
      },
    })
    console.log('ℹ️  Plano FREE atualizado')
  }

  // Criar plano PREMIUM se não existir
  if (!existingPremiumPlan) {
    await prisma.plan.create({
      data: {
        name: 'PREMIUM',
        price: 2990, // R$29,90 em centavos
        currency: 'BRL',
        monthlyLimitMatches: null,
        monthlyLimitVideos: null,
        isUnlimited: true,
      },
    })
    console.log('✅ Plano PREMIUM criado')
  } else {
    console.log('ℹ️  Plano PREMIUM já existe')
  }

  console.log('✅ Plans seeding completed')
}
