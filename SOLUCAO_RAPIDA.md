# ⚡ Solução Rápida - Erro "No such price"

## 🔍 Diagnóstico

O erro "No such price: 'price_1SXnFDLW3iRz1CdXgfDhRNsQ'" significa que:
- ✅ O Price ID existe no Stripe
- ❌ Mas a chave do Stripe em produção não consegue encontrá-lo

**Causa mais comum:** Ambiente diferente (TEST vs PRODUCTION)

## ✅ Solução Rápida

### Opção 1: Usar chave de TEST (Recomendado para desenvolvimento)

1. **No Render Dashboard:**
   - Vá em **Environment** → Variáveis de Ambiente
   - Configure `STRIPE_SECRET_KEY` com chave de TEST:
     ```
     sk_test_xxxxx
     ```
   - Reinicie o serviço

2. **Verifique se funciona:**
   - Teste o checkout novamente no app

### Opção 2: Criar produto em PRODUCTION

Se você quer usar modo PRODUCTION:

1. **Acesse Stripe em modo PRODUCTION:**
   - https://dashboard.stripe.com/products (sem /test/)
   - Crie o produto novamente
   - Copie o novo Price ID

2. **Atualize no banco de produção:**
   ```sql
   UPDATE plans 
   SET "stripePriceId" = 'price_NOVO_ID_AQUI'
   WHERE name = 'PREMIUM';
   ```

3. **Configure chave de PRODUCTION no Render:**
   ```
   sk_live_xxxxx
   ```

## 🧪 Testar Localmente

Para testar qual ambiente está correto:

```bash
# Com chave de TEST
STRIPE_SECRET_KEY=sk_test_xxxxx tsx scripts/test-price-id.ts price_1SXnFDLW3iRz1CdXgfDhRNsQ

# Com chave de PRODUCTION
STRIPE_SECRET_KEY=sk_live_xxxxx tsx scripts/test-price-id.ts price_1SXnFDLW3iRz1CdXgfDhRNsQ
```

O script vai mostrar se o Price ID existe e em qual ambiente está.

## 📋 Checklist

- [ ] Verificar qual chave está no Render (TEST ou PRODUCTION)
- [ ] Verificar em qual ambiente o produto foi criado no Stripe
- [ ] Garantir que ambos estejam no mesmo ambiente
- [ ] Testar checkout novamente

## 💡 Recomendação

**Durante desenvolvimento:** Use modo TEST
- Não cobra dinheiro real
- Mais seguro para testes
- Fácil de resetar

**Quando estiver pronto:** Migre para PRODUCTION
- Crie produto em modo PRODUCTION
- Use chave `sk_live_xxxxx`
- Atualize Price ID no banco

