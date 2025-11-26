# 🔧 Solução: Erro "Plan does not have a Stripe price ID configured"

## ❌ Problema

O frontend está enviando um `planId` que não existe no banco de dados:

```
🔄 Criando checkout para planId: 27491b63-56d2-45da-aaf4-8ec390f8c1ee
❌ Erro: Plan does not have a Stripe price ID configured
```

## ✅ Solução

### 1. Verificar IDs dos Planos no Banco

**IDs corretos no banco:**
- **PREMIUM**: `0d32152f-e130-4368-9b97-51c6f6cb3f73` ✅ (tem stripePriceId)
- **FREE**: `6d60c3fc-4fe2-4eac-89b7-c30e84c7a74f` (não precisa de stripePriceId)

### 2. Corrigir no Frontend

**Opção A: Buscar planos do endpoint (RECOMENDADO)**

O frontend deve buscar os planos do endpoint `/api/billing/plans` e usar o ID retornado:

```typescript
// ❌ ERRADO: Usar ID hardcoded
const planId = '27491b63-56d2-45da-aaf4-8ec390f8c1ee' // ID antigo/errado

// ✅ CORRETO: Buscar do endpoint
async function loadPlans() {
  const response = await fetch('https://futscout-api.onrender.com/api/billing/plans')
  const { plans } = await response.json()
  
  // Encontrar plano PREMIUM
  const premiumPlan = plans.find((p: any) => p.name === 'PREMIUM')
  
  if (premiumPlan) {
    // Usar o ID correto retornado pelo backend
    const planId = premiumPlan.id
    await createCheckout(planId)
  }
}
```

**Opção B: Atualizar ID hardcoded**

Se o frontend está usando ID hardcoded, atualize para:

```typescript
// ID correto do PREMIUM
const PREMIUM_PLAN_ID = '0d32152f-e130-4368-9b97-51c6f6cb3f73'
```

### 3. Verificar se está usando o endpoint correto

O endpoint `GET /api/billing/plans` retorna:

```json
{
  "plans": [
    {
      "id": "0d32152f-e130-4368-9b97-51c6f6cb3f73",
      "name": "PREMIUM",
      "price": 2990,
      "currency": "BRL",
      "monthlyLimitMatches": null,
      "monthlyLimitVideos": null,
      "monthlyLimitStandaloneVideos": null,
      "isUnlimited": true
    },
    {
      "id": "6d60c3fc-4fe2-4eac-89b7-c30e84c7a74f",
      "name": "FREE",
      "price": 0,
      "currency": "BRL",
      "monthlyLimitMatches": 5,
      "monthlyLimitVideos": null,
      "monthlyLimitStandaloneVideos": 5,
      "isUnlimited": false
    }
  ]
}
```

## 🔍 Como verificar qual ID está sendo usado

Adicione logs no frontend antes de criar o checkout:

```typescript
console.log('🔄 Criando checkout para planId:', planId)
console.log('📋 Planos disponíveis:', plans)
```

## ✅ Checklist

- [ ] Frontend busca planos de `/api/billing/plans` (não usa ID hardcoded)
- [ ] Frontend usa o `id` retornado pelo endpoint
- [ ] Verificar se não há cache de IDs antigos
- [ ] Testar novamente o checkout

## 🚨 Se o problema persistir

1. Verificar se o banco de produção está sincronizado:
   ```bash
   # No servidor de produção
   tsx scripts/check-premium-plan.ts
   ```

2. Verificar logs do backend para ver qual planId está chegando:
   - O backend já loga erros, verifique os logs

3. Se necessário, atualizar o stripePriceId no banco de produção:
   ```bash
   tsx scripts/update-premium-price.ts price_1SXlnqL1d3Ap7XCDF0krnX7P
   ```

