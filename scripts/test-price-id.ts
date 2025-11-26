import Stripe from 'stripe'
import 'dotenv/config'

/**
 * Script para testar se um Price ID existe no Stripe
 * 
 * Uso:
 *   STRIPE_SECRET_KEY=sk_test_xxxxx tsx scripts/test-price-id.ts price_xxxxx
 *   ou
 *   STRIPE_SECRET_KEY=sk_live_xxxxx tsx scripts/test-price-id.ts price_xxxxx
 */

const priceId = process.argv[2]
const stripeKey = process.env.STRIPE_SECRET_KEY

if (!priceId) {
  console.error('❌ Erro: Price ID não fornecido!')
  console.log('\n📖 Como usar:')
  console.log('   STRIPE_SECRET_KEY=sk_test_xxxxx tsx scripts/test-price-id.ts price_xxxxx')
  process.exit(1)
}

if (!stripeKey) {
  console.error('❌ Erro: STRIPE_SECRET_KEY não configurada!')
  console.log('\n💡 Configure a variável de ambiente:')
  console.log('   export STRIPE_SECRET_KEY=sk_test_xxxxx')
  console.log('   tsx scripts/test-price-id.ts price_xxxxx')
  process.exit(1)
}

// Detectar ambiente
const isTest = stripeKey.startsWith('sk_test_')
const isLive = stripeKey.startsWith('sk_live_')

console.log('🔍 Testando Price ID no Stripe...\n')
console.log(`Price ID: ${priceId}`)
console.log(`Ambiente: ${isTest ? 'TEST' : isLive ? 'PRODUCTION' : 'DESCONHECIDO'}`)
console.log(`Chave: ${stripeKey.substring(0, 10)}...${stripeKey.substring(stripeKey.length - 4)}\n`)

const stripe = new Stripe(stripeKey, {
  apiVersion: '2025-11-17.clover',
})

async function testPriceId() {
  try {
    console.log('🔍 Buscando Price ID no Stripe...')
    const price = await stripe.prices.retrieve(priceId)

    console.log('✅ Price ID encontrado!')
    console.log(`   ID: ${price.id}`)
    console.log(`   Produto: ${price.product}`)
    console.log(`   Valor: ${price.unit_amount ? price.unit_amount / 100 : 'N/A'} ${price.currency?.toUpperCase()}`)
    console.log(`   Ativo: ${price.active}`)
    console.log(`   Tipo: ${price.type}`)
    console.log(`   Ambiente: ${price.livemode ? 'PRODUCTION' : 'TEST'}\n`)

    // Verificar se o ambiente está correto
    if (isTest && price.livemode) {
      console.error('⚠️  ATENÇÃO: Price ID está em PRODUCTION mas você está usando chave TEST!')
      console.error('   Solução: Use chave sk_live_xxxxx ou crie o produto em modo TEST\n')
    } else if (isLive && !price.livemode) {
      console.error('⚠️  ATENÇÃO: Price ID está em TEST mas você está usando chave PRODUCTION!')
      console.error('   Solução: Use chave sk_test_xxxxx ou crie o produto em modo PRODUCTION\n')
    } else {
      console.log('✅ Ambiente correto! Price ID e chave estão no mesmo ambiente.\n')
    }
  } catch (error: any) {
    console.error('❌ Erro ao buscar Price ID:')
    console.error(`   Tipo: ${error.type}`)
    console.error(`   Mensagem: ${error.message}`)
    console.error(`   Code: ${error.code}\n`)

    if (error.code === 'resource_missing') {
      console.error('💡 O Price ID não existe neste ambiente!')
      console.error('\nPossíveis causas:')
      console.error('1. Price ID está em outro ambiente (TEST vs PRODUCTION)')
      console.error('2. Price ID foi deletado')
      console.error('3. Price ID está incorreto\n')
      console.error('💡 Solução:')
      if (isTest) {
        console.error('   - Crie o produto em modo TEST: https://dashboard.stripe.com/test/products')
        console.error('   - Ou use chave de PRODUCTION se o produto está em PRODUCTION')
      } else {
        console.error('   - Crie o produto em modo PRODUCTION: https://dashboard.stripe.com/products')
        console.error('   - Ou use chave de TEST se o produto está em TEST')
      }
    }
    process.exit(1)
  }
}

testPriceId()

