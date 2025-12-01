import { config } from 'dotenv'
import { stripe } from '../src/lib/stripe.js'

config()

async function verificarAmbiente() {
  const stripeKey = process.env.STRIPE_SECRET_KEY || ''
  const isLiveMode = stripeKey.startsWith('sk_live_')

  console.log('🔍 Verificando ambiente Stripe...\n')
  console.log(`Chave API: ${stripeKey.substring(0, 12)}...`)
  console.log(`Ambiente: ${isLiveMode ? 'PRODUÇÃO' : 'TEST'}\n`)

  if (isLiveMode) {
    console.log('⚠️  Você está usando chaves de PRODUÇÃO!')
    console.log('   Subscriptions criadas em ÁREA RESTRITA (test) não serão encontradas.\n')
    console.log('💡 Soluções:')
    console.log('   1. Criar subscription no ambiente de PRODUÇÃO do Stripe')
    console.log('   2. Ou usar chaves de TEST para testar localmente\n')
  } else {
    console.log('✅ Você está usando chaves de TEST')
    console.log('   Subscriptions criadas em ÁREA RESTRITA serão encontradas.\n')
  }

  // Testar conexão
  try {
    const account = await stripe.accounts.retrieve()
    console.log('✅ Conexão com Stripe OK')
    console.log(`   Account ID: ${account.id}`)
    console.log(`   Livemode: ${account.livemode}`)
    console.log(`   Country: ${account.country}`)
  } catch (error) {
    console.error('❌ Erro ao conectar com Stripe:', error)
  }
}

verificarAmbiente().catch(console.error)

