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
        monthlyLimitMatches: 5, // 5 jogos por mês
        monthlyLimitVideos: 5, // 5 vídeos por jogo
        monthlyLimitStandaloneVideos: 5, // 5 vídeos standalone (lances sem partida)
        isUnlimited: false,
      },
    })
  } else {
    // Atualizar plano existente se os limites mudaram
    const needsUpdate =
      existingFreePlan.monthlyLimitMatches !== 5 ||
      existingFreePlan.monthlyLimitVideos !== 5 ||
      existingFreePlan.monthlyLimitStandaloneVideos !== 5

    if (needsUpdate) {
      await prisma.plan.update({
        where: { name: 'FREE' },
        data: {
          monthlyLimitMatches: 5,
          monthlyLimitVideos: 5, // 5 vídeos por jogo
          monthlyLimitStandaloneVideos: 5, // 5 vídeos standalone
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
        monthlyLimitMatches: 10, // 10 jogos por mês
        monthlyLimitVideos: 10, // 10 vídeos por partida
        monthlyLimitStandaloneVideos: null, // Lances standalone ilimitados
        isUnlimited: false,
        stripePriceId: stripePriceId ?? null,
      },
    })
  } else {
    // Atualizar limites e stripePriceId se necessário
    const needsUpdate =
      existingPremiumPlan.monthlyLimitMatches !== 10 ||
      existingPremiumPlan.monthlyLimitVideos !== 10 ||
      existingPremiumPlan.monthlyLimitStandaloneVideos !== null ||
      existingPremiumPlan.isUnlimited !== false ||
      (stripePriceId && !existingPremiumPlan.stripePriceId)

    if (needsUpdate) {
      await prisma.plan.update({
        where: { name: 'PREMIUM' },
        data: {
          monthlyLimitMatches: 10,
          monthlyLimitVideos: 10,
          monthlyLimitStandaloneVideos: null,
          isUnlimited: false,
          stripePriceId: stripePriceId ?? existingPremiumPlan.stripePriceId,
        },
      })
    }
  }
}
