# 🔍 Verificar Ambiente do Stripe

## ❌ Problema

O erro "No such price: 'price_1SXnFDLW3iRz1CdXgfDhRNsQ'" indica que o Price ID não foi encontrado.

**Possíveis causas:**
1. ✅ Price ID existe no Stripe (você confirmou)
2. ❌ Price ID está em modo **TEST** mas a chave em produção está em modo **PRODUCTION**
3. ❌ Ou vice-versa: Price ID está em **PRODUCTION** mas a chave está em **TEST**

## 🔍 Como Verificar

### 1. Verificar qual ambiente você está usando no Stripe Dashboard

- **Modo TEST**: URL começa com `https://dashboard.stripe.com/test/`
- **Modo PRODUCTION**: URL começa com `https://dashboard.stripe.com/` (sem `/test/`)

### 2. Verificar qual chave está configurada no Render

No Render Dashboard:
1. Vá em **Environment** → Variáveis de Ambiente
2. Procure por `STRIPE_SECRET_KEY`
3. Verifique se começa com:
   - `sk_test_` = Modo TEST
   - `sk_live_` = Modo PRODUCTION

## ✅ Solução

### Opção A: Usar Price ID do ambiente correto

**Se você criou o produto em modo TEST:**
- Use chave `sk_test_xxxxx` em produção (temporariamente para testes)
- Ou crie o produto também em modo PRODUCTION

**Se você criou o produto em modo PRODUCTION:**
- Use chave `sk_live_xxxxx` em produção

### Opção B: Criar produto no ambiente correto

1. **Para TEST (recomendado durante desenvolvimento):**
   - Acesse: https://dashboard.stripe.com/test/products
   - Crie o produto novamente
   - Use o Price ID de TEST

2. **Para PRODUCTION (quando estiver pronto):**
   - Acesse: https://dashboard.stripe.com/products (sem /test/)
   - Crie o produto
   - Use o Price ID de PRODUCTION

## 🎯 Recomendação

Durante desenvolvimento, use **modo TEST**:
- Chave: `sk_test_xxxxx`
- Price ID de TEST
- Não cobra dinheiro real

Quando estiver pronto para produção:
- Crie produto em modo PRODUCTION
- Use chave `sk_live_xxxxx`
- Atualize o Price ID no banco

