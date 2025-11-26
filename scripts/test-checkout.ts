import { prisma } from '../src/lib/prisma.js'
import { stripe } from '../src/lib/stripe.js'

/**
 * Script para testar criação de checkout session
 *
 * Uso:
 *   tsx scripts/test-checkout.ts
 */

async function testCheckout() {
  console.log('🧪 Testando criação de checkout session...\n')

  try {
    // 1. Buscar plano PREMIUM
    const plan = await prisma.plan.findUnique({
      where: { name: 'PREMIUM' },
    })

    if (!plan) {
      console.error('❌ Plano PREMIUM não encontrado!')
      process.exit(1)
    }

    console.log('✅ Plano PREMIUM encontrado:')
    console.log(`   ID: ${plan.id}`)
    console.log(
      `   Stripe Price ID: ${plan.stripePriceId || '❌ NÃO CONFIGURADO'}\n`,
    )

    if (!plan.stripePriceId) {
      console.error('❌ Plano não tem stripePriceId configurado!')
      process.exit(1)
    }

    // 2. Verificar se o Price ID existe no Stripe
    console.log('🔍 Verificando Price ID no Stripe...')
    try {
      const price = await stripe.prices.retrieve(plan.stripePriceId)
      console.log('✅ Price ID encontrado no Stripe:')
      console.log(`   ID: ${price.id}`)
      console.log(`   Produto: ${price.product}`)
      console.log(
        `   Valor: ${price.unit_amount ? price.unit_amount / 100 : 'N/A'} ${price.currency?.toUpperCase()}`,
      )
      console.log(`   Ativo: ${price.active}`)
      console.log(`   Tipo: ${price.type}\n`)
    } catch (error: any) {
      console.error('❌ Erro ao buscar Price ID no Stripe:')
      console.error(`   Tipo: ${error.type}`)
      console.error(`   Mensagem: ${error.message}`)
      console.error(`   Code: ${error.code}\n`)

      if (error.code === 'resource_missing') {
        console.error('💡 O Price ID não existe no Stripe!')
        console.error('   Possíveis causas:')
        console.error('   1. Price ID incorreto')
        console.error('   2. Price ID de outro ambiente (test vs production)')
        console.error('   3. Price ID foi deletado\n')
        console.error('💡 Verifique:')
        console.error(
          '   - Se está usando a chave correta (test vs production)',
        )
        console.error('   - Se o Price ID está correto no Stripe Dashboard')
      }
      process.exit(1)
    }

    // 3. Criar um customer de teste
    console.log('🔍 Criando customer de teste...')
    const testCustomer = await stripe.customers.create({
      email: 'test@example.com',
      name: 'Test User',
      metadata: {
        test: 'true',
      },
    })
    console.log(`✅ Customer criado: ${testCustomer.id}\n`)

    // 4. Tentar criar checkout session
    console.log('🔍 Tentando criar checkout session...')
    try {
      const session = await stripe.checkout.sessions.create({
        customer: testCustomer.id,
        mode: 'subscription',
        line_items: [
          {
            price: plan.stripePriceId,
            quantity: 1,
          },
        ],
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        metadata: {
          test: 'true',
        },
      })

      console.log('✅ Checkout session criada com sucesso!')
      console.log(`   Session ID: ${session.id}`)
      console.log(`   URL: ${session.url}\n`)

      // Limpar: deletar customer de teste
      await stripe.customers.del(testCustomer.id)
      console.log('🧹 Customer de teste deletado\n')

      console.log('🎉 Teste concluído com sucesso!')
    } catch (error: any) {
      console.error('❌ Erro ao criar checkout session:')
      console.error(`   Tipo: ${error.type}`)
      console.error(`   Mensagem: ${error.message}`)
      console.error(`   Code: ${error.code}`)

      // Limpar: deletar customer de teste
      try {
        await stripe.customers.del(testCustomer.id)
      } catch {
        // Ignorar erro ao deletar
      }

      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Erro geral:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testCheckout()
