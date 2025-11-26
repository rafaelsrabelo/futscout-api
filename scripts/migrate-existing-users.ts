import { prisma } from '../src/lib/prisma.js'

/**
 * Script para migrar usuários existentes para o sistema de billing
 * 
 * O que faz:
 * 1. Verifica se todos os usuários existentes serão tratados como FREE (já funciona automaticamente)
 * 2. Opcionalmente: inicializa contadores de uso para usuários que já criaram jogos/vídeos
 * 
 * Uso:
 *   tsx scripts/migrate-existing-users.ts
 */

async function migrateExistingUsers() {
  console.log('🔄 Iniciando migração de usuários existentes...\n')

  try {
    // 1. Verificar se plano FREE existe
    const freePlan = await prisma.plan.findUnique({
      where: { name: 'FREE' },
    })

    if (!freePlan) {
      console.error('❌ Plano FREE não encontrado!')
      console.log('💡 Execute primeiro: npm run start:dev (para rodar seedPlans)')
      process.exit(1)
    }

    console.log('✅ Plano FREE encontrado')
    console.log(`   Limites: ${freePlan.monthlyLimitMatches} jogos, ${freePlan.monthlyLimitVideos} vídeos por mês\n`)

    // 2. Contar usuários existentes
    const totalUsers = await prisma.user.count()
    console.log(`📊 Total de usuários no sistema: ${totalUsers}`)

    // 3. Contar usuários com assinatura
    const usersWithSubscription = await prisma.subscription.count({
      where: {
        status: 'active',
        currentPeriodEnd: {
          gte: new Date(),
        },
      },
    })

    const usersWithoutSubscription = totalUsers - usersWithSubscription
    console.log(`   ✅ Com assinatura ativa: ${usersWithSubscription}`)
    console.log(`   🆓 Sem assinatura (serão tratados como FREE): ${usersWithoutSubscription}\n`)

    // 4. Verificar usuários que já criaram jogos/vídeos este mês
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    // Contar jogos criados este mês por usuários sem assinatura
    const matchesThisMonth = await prisma.match.groupBy({
      by: ['athleteId'],
      where: {
        createdAt: {
          gte: new Date(year, month - 1, 1), // Primeiro dia do mês
        },
        athlete: {
          user: {
            subscriptions: {
              none: {
                status: 'active',
                currentPeriodEnd: {
                  gte: new Date(),
                },
              },
            },
          },
        },
      },
      _count: {
        id: true,
      },
    })

    // Contar vídeos criados este mês por usuários sem assinatura
    const playsThisMonth = await prisma.play.groupBy({
      by: ['athleteId'],
      where: {
        createdAt: {
          gte: new Date(year, month - 1, 1),
        },
        videoUrl: {
          not: null,
        },
        athlete: {
          user: {
            subscriptions: {
              none: {
                status: 'active',
                currentPeriodEnd: {
                  gte: new Date(),
                },
              },
            },
          },
        },
      },
      _count: {
        id: true,
      },
    })

    console.log(`📈 Estatísticas do mês atual (${month}/${year}):`)
    console.log(`   Usuários que criaram jogos: ${matchesThisMonth.length}`)
    console.log(`   Usuários que criaram vídeos: ${playsThisMonth.length}\n`)

    // 5. Inicializar contadores de uso para usuários que já criaram conteúdo
    console.log('🔄 Inicializando contadores de uso...')

    let usageCreated = 0
    let usageUpdated = 0

    // Processar jogos
    for (const matchGroup of matchesThisMonth) {
      const athlete = await prisma.athleteProfile.findUnique({
        where: { id: matchGroup.athleteId },
        include: { user: true },
      })

      if (!athlete) continue

      const userId = athlete.userId

      const usage = await prisma.usage.upsert({
        where: {
          userId_month_year: {
            userId,
            month,
            year,
          },
        },
        create: {
          userId,
          month,
          year,
          matchesUsed: matchGroup._count.id,
          videosUsed: 0,
        },
        update: {
          matchesUsed: matchGroup._count.id,
        },
      })

      if (usage.createdAt.getTime() === usage.updatedAt.getTime()) {
        usageCreated++
      } else {
        usageUpdated++
      }
    }

    // Processar vídeos
    for (const playGroup of playsThisMonth) {
      const athlete = await prisma.athleteProfile.findUnique({
        where: { id: playGroup.athleteId },
        include: { user: true },
      })

      if (!athlete) continue

      const userId = athlete.userId

      await prisma.usage.upsert({
        where: {
          userId_month_year: {
            userId,
            month,
            year,
          },
        },
        create: {
          userId,
          month,
          year,
          matchesUsed: 0,
          videosUsed: playGroup._count.id,
        },
        update: {
          videosUsed: {
            increment: playGroup._count.id,
          },
        },
      })
    }

    console.log('✅ Contadores inicializados:')
    console.log(`   Criados: ${usageCreated}`)
    console.log(`   Atualizados: ${usageUpdated}\n`)

    // 6. Resumo final
    console.log('📋 RESUMO:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`✅ Todos os ${totalUsers} usuários estão configurados`)
    console.log(`   • ${usersWithSubscription} com assinatura PREMIUM`)
    console.log(`   • ${usersWithoutSubscription} no plano FREE (automático)`)
    console.log('')
    console.log('💡 IMPORTANTE:')
    console.log('   • Usuários sem assinatura JÁ são tratados como FREE automaticamente')
    console.log('   • Não é necessário criar registros de Subscription para eles')
    console.log('   • O sistema verifica limites automaticamente quando tentam criar conteúdo')
    console.log('   • Contadores de uso são criados automaticamente na primeira criação')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    console.log('🎉 Migração concluída!')
  } catch (error) {
    console.error('❌ Erro na migração:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

migrateExistingUsers()

