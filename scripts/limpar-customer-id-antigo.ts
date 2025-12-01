import { config } from 'dotenv'
import { prisma } from '../src/lib/prisma.js'

config()

const userId = 'da037682-f58f-4b0b-afba-f7ec12b9ebf8' // Seu userId

async function limparCustomerId() {
  console.log('🧹 Limpando stripeCustomerId antigo...\n')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      stripeCustomerId: true,
    },
  })

  if (!user) {
    console.error('❌ Usuário não encontrado')
    return
  }

  console.log('👤 Usuário encontrado:')
  console.log(`   Email: ${user.email}`)
  console.log(
    `   Stripe Customer ID atual: ${user.stripeCustomerId || 'não configurado'}\n`,
  )

  if (!user.stripeCustomerId) {
    console.log('ℹ️ Usuário já não tem stripeCustomerId')
    return
  }

  // Limpar stripeCustomerId
  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeCustomerId: null,
    },
  })

  console.log('✅ stripeCustomerId limpo com sucesso!')
  console.log('\n💡 Próximos passos:')
  console.log('   1. Fazer um novo checkout no app')
  console.log(
    '   2. Isso criará um novo customer no ambiente correto (PRODUÇÃO)',
  )
  console.log('   3. O webhook processará e salvará o novo customer ID')
  console.log('   4. Tudo funcionará corretamente!')
}

limparCustomerId().catch(console.error)
