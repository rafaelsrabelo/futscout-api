# Scripts SQL para Gerenciar Subscriptions

Estes scripts SQL podem ser executados diretamente no PostgreSQL para verificar e gerenciar subscriptions.

## ⚠️ Importante

**Você NÃO pode buscar dados do Stripe diretamente via SQL.** 

Para sincronizar subscriptions, você precisa:
1. **Opção 1 (Recomendada)**: Usar o script TypeScript `sincronizar-todos-usuarios.ts`
2. **Opção 2**: Buscar os dados do Stripe manualmente (via Dashboard ou API) e usar os scripts SQL para inserir/atualizar

## 📋 Scripts Disponíveis

### 1. `verificar-usuarios-sem-subscription.sql`
**O que faz**: Lista usuários que têm `stripeCustomerId` mas não têm subscription ativa.

**Quando usar**: Para ver quem precisa ser sincronizado.

**Como executar**:
```bash
psql $DATABASE_URL -f scripts/verificar-usuarios-sem-subscription.sql
```

### 2. `verificar-subscriptions.sql`
**O que faz**: Mostra o status atual de todas as subscriptions no banco.

**Quando usar**: Para verificar o estado atual das subscriptions.

**Como executar**:
```bash
psql $DATABASE_URL -f scripts/verificar-subscriptions.sql
```

### 3. `inserir-subscription-manual.sql`
**O que faz**: Template para inserir/atualizar subscription manualmente.

**Quando usar**: Quando você já tem os dados do Stripe (subscription ID, price ID, etc) e quer inserir manualmente.

**Como usar**:
1. Abra o arquivo
2. Substitua os valores marcados com `<<>>`
3. Execute no PostgreSQL

**Dados necessários**:
- `USER_ID`: ID do usuário (UUID)
- `PLAN_ID`: ID do plano PREMIUM (UUID)
- `STRIPE_SUBSCRIPTION_ID`: ID da subscription no Stripe (ex: `sub_xxxxx`)
- `CURRENT_PERIOD_END`: Data de término do período (formato: `'2025-12-31 23:59:59'`)
- `STATUS`: `'active'`, `'past_due'` ou `'canceled'`

### 4. `upsert-subscription-template.sql`
**O que faz**: Template para fazer UPSERT (insert ou update) de subscription usando `stripeCustomerId`.

**Quando usar**: Quando você tem o `stripeCustomerId` e `stripeSubscriptionId` e quer fazer upsert.

**Como usar**:
1. Abra o arquivo
2. Substitua `<<STRIPE_CUSTOMER_ID>>` e `<<STRIPE_SUBSCRIPTION_ID>>`
3. Substitua `<<CURRENT_PERIOD_END>>`
4. Execute no PostgreSQL

## 🔍 Como Obter os Dados do Stripe

### Via Stripe Dashboard:
1. Acesse https://dashboard.stripe.com/customers
2. Encontre o customer pelo email
3. Veja as subscriptions ativas
4. Copie:
   - `Customer ID` (ex: `cus_xxxxx`)
   - `Subscription ID` (ex: `sub_xxxxx`)
   - `Current period end` (data)

### Via Stripe API:
```bash
# Listar customers
curl https://api.stripe.com/v1/customers \
  -u sk_live_xxxxx:

# Listar subscriptions de um customer
curl https://api.stripe.com/v1/subscriptions?customer=cus_xxxxx \
  -u sk_live_xxxxx:
```

## 📝 Exemplo Completo

### Passo 1: Verificar quem precisa ser sincronizado
```sql
-- Execute verificar-usuarios-sem-subscription.sql
```

### Passo 2: Buscar dados do Stripe
- Acesse o Stripe Dashboard
- Encontre o customer
- Copie: `customer_id`, `subscription_id`, `current_period_end`

### Passo 3: Inserir/Atualizar no banco
```sql
-- Use upsert-subscription-template.sql
-- Substitua os valores e execute
```

## ⚡ Alternativa Rápida (Recomendada)

Em vez de fazer manualmente, use o script TypeScript que faz tudo automaticamente:

```bash
tsx scripts/sincronizar-todos-usuarios.ts
```

Este script:
- ✅ Busca todos os usuários com `stripeCustomerId`
- ✅ Busca subscriptions no Stripe automaticamente
- ✅ Cria/atualiza no banco
- ✅ Mostra resumo completo

## 🎯 Quando Usar SQL vs TypeScript

**Use SQL quando**:
- Você quer apenas verificar/consultar dados
- Você já tem os dados do Stripe e quer inserir manualmente
- Você precisa fazer ajustes pontuais

**Use TypeScript quando**:
- Você quer sincronizar automaticamente
- Você não tem os dados do Stripe ainda
- Você quer processar muitos usuários de uma vez

