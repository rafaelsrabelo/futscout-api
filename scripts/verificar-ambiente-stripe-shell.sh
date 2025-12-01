#!/bin/bash
# Script para verificar qual ambiente do Stripe está configurado

echo "🔍 Verificando ambiente do Stripe..."
echo ""

# Verificar se está usando chave de TEST ou PRODUCTION
if echo "$STRIPE_SECRET_KEY" | grep -q "^sk_live_"; then
  echo "🌍 Ambiente: PRODUÇÃO (sk_live_...)"
  echo "⚠️  ATENÇÃO: Customers criados em TEST não existem aqui!"
elif echo "$STRIPE_SECRET_KEY" | grep -q "^sk_test_"; then
  echo "🌍 Ambiente: TEST (sk_test_...)"
  echo "✅ Customers de TEST devem funcionar aqui"
else
  echo "❌ STRIPE_SECRET_KEY não configurada ou formato inválido"
fi

echo ""
echo "💡 Solução:"
echo "   - Se o customer foi criado em TEST, use chave sk_test_"
echo "   - Se o customer foi criado em PRODUCTION, use chave sk_live_"
echo ""
echo "🔍 Para verificar onde o customer foi criado:"
echo "   1. Acesse: https://dashboard.stripe.com/test/customers"
echo "   2. Se aparecer = foi criado em TEST"
echo "   3. Acesse: https://dashboard.stripe.com/customers (sem /test)"
echo "   4. Se aparecer = foi criado em PRODUCTION"

