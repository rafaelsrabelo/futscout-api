#!/bin/bash
# Script para atualizar o stripePriceId do plano PREMIUM diretamente no shell
# Uso: ./atualizar-price-id-shell.sh price_xxxxx

PRICE_ID=$1

if [ -z "$PRICE_ID" ]; then
  echo "❌ Erro: Price ID não fornecido!"
  echo ""
  echo "📖 Como usar:"
  echo "   ./atualizar-price-id-shell.sh price_xxxxx"
  echo ""
  echo "💡 Como encontrar o Price ID no Stripe:"
  echo "   1. Acesse: https://dashboard.stripe.com/test/products"
  echo "   2. Clique no produto PREMIUM"
  echo "   3. Na seção 'Preços', clique no preço"
  echo "   4. Copie o 'Price ID' (começa com price_)"
  exit 1
fi

if [[ ! $PRICE_ID == price_* ]]; then
  echo "❌ Erro: Price ID deve começar com 'price_'"
  echo "   Você forneceu: $PRICE_ID"
  exit 1
fi

cd /opt/render/project/src && npx tsx -e "
import { PrismaClient } from './generated/prisma/index.js';
const prisma = new PrismaClient();
(async () => {
  try {
    const plan = await prisma.plan.findUnique({ where: { name: 'PREMIUM' } });
    if (!plan) { console.error('❌ Plano PREMIUM não encontrado!'); process.exit(1); }
    console.log('✅ Plano PREMIUM encontrado');
    console.log(\`   Stripe Price ID atual: \${plan.stripePriceId || 'não configurado'}\`);
    console.log(\`🔄 Atualizando para: $PRICE_ID...\`);
    const updated = await prisma.plan.update({ where: { name: 'PREMIUM' }, data: { stripePriceId: '$PRICE_ID' } });
    console.log('✅ Atualizado com sucesso!');
    console.log(\`   Novo Stripe Price ID: \${updated.stripePriceId}\`);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    await prisma.\$disconnect();
  }
})();
"

