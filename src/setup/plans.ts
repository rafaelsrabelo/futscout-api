import { prisma } from '../lib/prisma.js'

// `null` = sem cota por plano no chat de busca (IAFutscore).
//
// Planos são exclusivos de atleta e o chat é exclusivo de observador — todo
// observador caía no fallback do FREE e recebia "faça upgrade do seu plano"
// sem ter plano para comprar. O Helper IA vem incluso no app; quem contém
// abuso agora é o `rateLimitScoutChat`. A coluna fica para o caso de um dia
// existir um recurso de IA do lado do atleta.
const FREE_AI_MESSAGES = null

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
        monthlyLimitAiMessages: FREE_AI_MESSAGES, // mensagens no chat de busca
        isUnlimited: false,
      },
    })
  } else {
    // Atualizar plano existente se os limites mudaram
    const needsUpdate =
      existingFreePlan.monthlyLimitMatches !== 10 ||
      existingFreePlan.monthlyLimitVideos !== 10 ||
      existingFreePlan.monthlyLimitStandaloneVideos !== 10 ||
      existingFreePlan.monthlyLimitAiMessages !== FREE_AI_MESSAGES

    if (needsUpdate) {
      await prisma.plan.update({
        where: { name: 'FREE' },
        data: {
          monthlyLimitMatches: 10,
          monthlyLimitVideos: 10, // 10 vídeos por jogo
          monthlyLimitStandaloneVideos: 10, // 10 vídeos standalone
          monthlyLimitAiMessages: FREE_AI_MESSAGES,
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
        monthlyLimitAiMessages: null, // Chat de busca ilimitado
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
      existingPremiumPlan.monthlyLimitAiMessages !== null ||
      existingPremiumPlan.isUnlimited !== false ||
      (stripePriceId && !existingPremiumPlan.stripePriceId)

    if (needsUpdate) {
      await prisma.plan.update({
        where: { name: 'PREMIUM' },
        data: {
          monthlyLimitMatches: 20,
          monthlyLimitVideos: 20,
          monthlyLimitStandaloneVideos: null,
          monthlyLimitAiMessages: null,
          isUnlimited: false,
          stripePriceId: stripePriceId ?? existingPremiumPlan.stripePriceId,
        },
      })
    }
  }
}
