import { config } from 'dotenv'
import { prisma } from '../src/lib/prisma.js'

config()

async function atualizarLimites() {
  console.log('🔄 Atualizando limites dos planos...\n')

  // Atualizar plano FREE
  console.log('📦 Atualizando plano FREE...\n')
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
    console.log('✅ Plano FREE atualizado:')
    console.log('   monthlyLimitMatches: 5')
    console.log('   monthlyLimitVideos: 5')
    console.log('   monthlyLimitStandaloneVideos: 5\n')
  } else {
    console.log('⚠️  Plano FREE não encontrado\n')
  }

  // Atualizar plano PREMIUM
  console.log('📦 Atualizando plano PREMIUM...\n')

  const premiumPlan = await prisma.plan.findFirst({
    where: { name: 'PREMIUM' },
  })

  if (!premiumPlan) {
    console.error('❌ Plano PREMIUM não encontrado')
    return
  }

  console.log('📦 Plano PREMIUM atual:')
  console.log(
    `   monthlyLimitMatches: ${premiumPlan.monthlyLimitMatches ?? 'null'}`,
  )
  console.log(
    `   monthlyLimitVideos: ${premiumPlan.monthlyLimitVideos ?? 'null'}`,
  )
  console.log(
    `   monthlyLimitStandaloneVideos: ${premiumPlan.monthlyLimitStandaloneVideos ?? 'null'}`,
  )
  console.log(`   isUnlimited: ${premiumPlan.isUnlimited}\n`)

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

  console.log('✅ Plano PREMIUM atualizado:')
  console.log('   monthlyLimitMatches: 10')
  console.log('   monthlyLimitVideos: 10')
  console.log('   monthlyLimitStandaloneVideos: null (ilimitado)')
  console.log('   isUnlimited: false\n')

  console.log('✅ Todos os limites foram atualizados com sucesso!')
  console.log(
    '💡 A API agora retornará os limites corretos para ambos os planos!',
  )
}

atualizarLimites().catch(console.error)
