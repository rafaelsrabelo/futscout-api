# 🚀 Atualizar Plano PREMIUM em Produção

## ❌ Problema Identificado

O endpoint `/api/billing/plans` retorna:
- **PREMIUM ID**: `27491b63-56d2-45da-aaf4-8ec390f8c1ee` ✅ (correto)
- **Mas**: Este plano não tem `stripePriceId` configurado ❌

## ✅ Solução

### 1. Obter o Price ID do Stripe

1. Acesse: https://dashboard.stripe.com/test/products
2. Clique no produto PREMIUM
3. Clique no preço (R$ 29,90)
4. Copie o **Price ID** (começa com `price_`)

### 2. Atualizar o Banco de Produção

**Opção A: Via SQL direto no Render**

No Render Dashboard → Database → Connect → Execute SQL:

```sql
UPDATE plans 
SET "stripePriceId" = 'price_xxxxx' 
WHERE name = 'PREMIUM';
```

Substitua `price_xxxxx` pelo Price ID real.

**Opção B: Via Script (se tiver acesso)**

Se conseguir executar scripts no servidor de produção:

```bash
# Conectar ao banco de produção
export DATABASE_URL="sua_url_de_producao"
tsx scripts/update-premium-price.ts price_xxxxx
```

### 3. Verificar se Funcionou

Execute novamente:

```bash
curl -X GET https://futscout-api.onrender.com/api/billing/plans | jq .
```

O plano PREMIUM deve aparecer normalmente (mas ainda não vai mostrar o stripePriceId, pois é informação interna).

### 4. Testar Checkout

Depois de atualizar, teste o checkout novamente. Deve funcionar!

## ⚠️ Observação Adicional

O plano FREE em produção ainda mostra:
- `monthlyLimitVideos: 25` (deveria ser `null`)
- Não tem `monthlyLimitStandaloneVideos` (deveria ter `5`)

Isso indica que a migration não foi aplicada em produção. Mas isso não impede o checkout do PREMIUM de funcionar.

## 📋 Checklist

- [ ] Obter Price ID do Stripe
- [ ] Atualizar `stripePriceId` do PREMIUM em produção
- [ ] Verificar se o checkout funciona
- [ ] (Opcional) Aplicar migration do FREE em produção

