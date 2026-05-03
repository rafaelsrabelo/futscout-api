import { prisma } from '../lib/prisma.js'

export async function seedPlans() {
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
        monthlyLimitMatches: 10, // 10 jogos por mês
        monthlyLimitVideos: 10, // 10 vídeos por jogo
        monthlyLimitStandaloneVideos: 10, // 10 vídeos standalone (lances sem partida)
        isUnlimited: false,
      },
    })
  } else {
    // Atualizar plano existente se os limites mudaram
    const needsUpdate =
      existingFreePlan.monthlyLimitMatches !== 10 ||
      existingFreePlan.monthlyLimitVideos !== 10 ||
      existingFreePlan.monthlyLimitStandaloneVideos !== 10

    if (needsUpdate) {
      await prisma.plan.update({
        where: { name: 'FREE' },
        data: {
          monthlyLimitMatches: 10,
          monthlyLimitVideos: 10, // 10 vídeos por jogo
          monthlyLimitStandaloneVideos: 10, // 10 vídeos standalone
        },
      })
    }
  }

  // Criar plano PREMIUM se não existir
  const stripePriceId = process.env.STRIPE_PRICE_ID || null

  if (!existingPremiumPlan) {
    await prisma.plan.create({
      data: {
        name: 'PREMIUM',
        price: 2990, // R$29,90 em centavos
        currency: 'BRL',
        monthlyLimitMatches: 20, // 20 jogos por mês
        monthlyLimitVideos: 20, // 20 vídeos por partida
        monthlyLimitStandaloneVideos: null, // Lances standalone ilimitados
        isUnlimited: false,
        stripePriceId: stripePriceId ?? null,
      },
    })
  } else {
    // Atualizar limites e stripePriceId se necessário
    const needsUpdate =
      existingPremiumPlan.monthlyLimitMatches !== 20 ||
      existingPremiumPlan.monthlyLimitVideos !== 20 ||
      existingPremiumPlan.monthlyLimitStandaloneVideos !== null ||
      existingPremiumPlan.isUnlimited !== false ||
      (stripePriceId && !existingPremiumPlan.stripePriceId)

    if (needsUpdate) {
      await prisma.plan.update({
        where: { name: 'PREMIUM' },
        data: {
          monthlyLimitMatches: 20,
          monthlyLimitVideos: 20,
          monthlyLimitStandaloneVideos: null,
          isUnlimited: false,
          stripePriceId: stripePriceId ?? existingPremiumPlan.stripePriceId,
        },
      })
    }
  }
}
