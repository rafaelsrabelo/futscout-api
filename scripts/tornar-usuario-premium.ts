import { prisma } from '../src/lib/prisma.js'

/**
 * Script para tornar usuários premium manualmente
 *
 * Uso:
 *   tsx scripts/tornar-usuario-premium.ts <email1> [email2] [email3] ...
 *
 * Exemplos:
 *   tsx scripts/tornar-usuario-premium.ts usuario@email.com
 *   tsx scripts/tornar-usuario-premium.ts user1@email.com user2@email.com user3@email.com
 *
 * Opções:
 *   --months <número>  - Define quantos meses de premium (padrão: 12 meses)
 *   --permanent        - Torna premium permanente (até 2099)
 */

interface Options {
  months?: number
  permanent?: boolean
}

async function tornarUsuarioPremium(emails: string[], options: Options = {}) {
  try {
    console.log('🌟 Tornando usuários premium...\n')

    // Buscar plano PREMIUM
    const premiumPlan = await prisma.plan.findUnique({
      where: { name: 'PREMIUM' },
    })

    if (!premiumPlan) {
      console.error('❌ Plano PREMIUM não encontrado!')
      console.log(
        '💡 Execute primeiro: npm run start:dev (para rodar seedPlans)',
      )
      process.exit(1)
    }

    console.log(`✅ Plano PREMIUM encontrado (ID: ${premiumPlan.id})\n`)

    // Calcular data de expiração
    const currentPeriodEnd = options.permanent
      ? new Date('2099-12-31T23:59:59Z')
      : (() => {
          const months = options.months || 12
          const date = new Date()
          date.setMonth(date.getMonth() + months)
          return date
        })()

    console.log(`📅 Assinatura válida até: ${currentPeriodEnd.toISOString()}\n`)

    const results = {
      success: [] as string[],
      notFound: [] as string[],
      errors: [] as { email: string; error: string }[],
    }

    // Processar cada email
    for (const email of emails) {
      try {
        // Buscar usuário
        const user = await prisma.user.findFirst({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
          },
        })

        if (!user) {
          console.log(`❌ Usuário não encontrado: ${email}`)
          results.notFound.push(email)
          continue
        }

        // Verificar se já tem subscription
        const existingSubscription = await prisma.subscription.findFirst({
          where: { userId: user.id },
        })

        if (existingSubscription) {
          // Atualizar subscription existente
          await prisma.subscription.update({
            where: { id: existingSubscription.id },
            data: {
              planId: premiumPlan.id,
              status: 'active',
              currentPeriodEnd,
            },
          })
          console.log(`✅ ${email} - Subscription atualizada para PREMIUM`)
        } else {
          // Criar nova subscription
          await prisma.subscription.create({
            data: {
              userId: user.id,
              planId: premiumPlan.id,
              status: 'active',
              currentPeriodEnd,
            },
          })
          console.log(`✅ ${email} - Nova subscription PREMIUM criada`)
        }

        results.success.push(email)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Erro desconhecido'
        console.error(`❌ Erro ao processar ${email}:`, errorMessage)
        results.errors.push({ email, error: errorMessage })
      }
    }

    // Resumo
    console.log(`\n${'='.repeat(50)}`)
    console.log('📊 RESUMO')
    console.log('='.repeat(50))
    console.log(`✅ Sucesso: ${results.success.length}`)
    console.log(`❌ Não encontrados: ${results.notFound.length}`)
    console.log(`⚠️  Erros: ${results.errors.length}`)

    if (results.success.length > 0) {
      console.log('\n✅ Usuários tornados premium:')
      for (const email of results.success) {
        console.log(`   - ${email}`)
      }
    }

    if (results.notFound.length > 0) {
      console.log('\n❌ Usuários não encontrados:')
      for (const email of results.notFound) {
        console.log(`   - ${email}`)
      }
    }

    if (results.errors.length > 0) {
      console.log('\n⚠️  Erros:')
      for (const { email, error } of results.errors) {
        console.log(`   - ${email}: ${error}`)
      }
    }

    console.log('\n✅ Processo concluído!')
  } catch (error) {
    console.error('\n❌ Erro fatal:', error)
    if (error instanceof Error) {
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Parse argumentos
const args = process.argv.slice(2)
const emails: string[] = []
const options: Options = {}

for (let i = 0; i < args.length; i++) {
  const arg = args[i]

  if (!arg) continue

  if (arg === '--months' && i + 1 < args.length) {
    const monthsArg = args[i + 1]
    if (!monthsArg) {
      console.error('❌ --months requer um valor')
      process.exit(1)
    }
    options.months = Number.parseInt(monthsArg, 10)
    if (Number.isNaN(options.months)) {
      console.error('❌ --months deve ser um número')
      process.exit(1)
    }
    i++ // Pular próximo argumento
  } else if (arg === '--permanent') {
    options.permanent = true
  } else if (!arg.startsWith('--')) {
    emails.push(arg)
  }
}

if (emails.length === 0) {
  console.error('❌ Nenhum email fornecido')
  console.error(
    '\nUso: tsx scripts/tornar-usuario-premium.ts <email1> [email2] ...',
  )
  console.error('\nExemplos:')
  console.error('  tsx scripts/tornar-usuario-premium.ts usuario@email.com')
  console.error(
    '  tsx scripts/tornar-usuario-premium.ts user1@email.com user2@email.com',
  )
  console.error(
    '  tsx scripts/tornar-usuario-premium.ts usuario@email.com --months 6',
  )
  console.error(
    '  tsx scripts/tornar-usuario-premium.ts usuario@email.com --permanent',
  )
  process.exit(1)
}

tornarUsuarioPremium(emails, options)
