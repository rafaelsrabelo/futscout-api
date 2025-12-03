import { config } from 'dotenv'
import { prisma } from '../src/lib/prisma.js'

config()

async function atualizarLimites() {
  // Atualizar plano FREE
  const freePlan = await prisma.plan.findFirst({
    where: { name: 'FREE' },
  })

  if (freePlan) {
    await prisma.plan.update({
      where: { id: freePlan.id },
      data: {
        monthlyLimitMatches: 5, // 5 jogos por mês
        monthlyLimitVideos: 5, // 5 vídeos por jogo
        monthlyLimitStandaloneVideos: 5, // 5 vídeos standalone
        isUnlimited: false,
      },
    })
  }

  // Atualizar plano PREMIUM

  const premiumPlan = await prisma.plan.findFirst({
    where: { name: 'PREMIUM' },
  })

  if (!premiumPlan) {
    return
  }

  // Atualizar para os limites corretos
  await prisma.plan.update({
    where: { id: premiumPlan.id },
    data: {
      monthlyLimitMatches: 10, // 10 jogos por mês
      monthlyLimitVideos: 10, // 10 vídeos por partida
      monthlyLimitStandaloneVideos: null, // Lances standalone ilimitados
      isUnlimited: false,
    },
  })
}

atualizarLimites().catch(console.error)
