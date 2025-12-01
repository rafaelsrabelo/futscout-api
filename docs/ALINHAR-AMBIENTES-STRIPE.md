# 🔑 Alinhar Ambientes Stripe (Frontend e Backend)

## ⚠️ Problema Atual

O **frontend** está criando checkouts em **TESTE** (`cs_test_...`), mas o **backend** está consultando subscriptions em **PRODUÇÃO** (`sk_live_...`).

**Resultado:** O backend não encontra as subscriptions porque estão em ambientes diferentes!

## ✅ Solução: Alinhar Ambientes

### Opção 1: Usar PRODUÇÃO (Recomendado para app em produção)

#### Backend (já está em produção):
```bash
# Verificar se está usando chave de produção
echo $STRIPE_SECRET_KEY | cut -c1-8
# Deve retornar: sk_live_
```

#### Frontend (React Native):
```typescript
// No arquivo de configuração do Stripe
const STRIPE_PUBLISHABLE_KEY = 'pk_live_...' // Chave de PRODUÇÃO
```

### Opção 2: Usar TESTE (Para desenvolvimento)

#### Backend:
```bash
# No .env ou variáveis de ambiente do Render
STRIPE_SECRET_KEY=sk_test_... # Chave de TESTE
STRIPE_PUBLISHABLE_KEY=pk_test_... # Chave de TESTE
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook secret de TESTE
```

#### Frontend:
```typescript
// No arquivo de configuração do Stripe
const STRIPE_PUBLISHABLE_KEY = 'pk_test_...' // Chave de TESTE
```

## 🔍 Como Verificar Qual Ambiente Está Sendo Usado

### Backend:
Os logs mostram:
```
🌍 [get-subscription] Ambiente Stripe: PRODUÇÃO
```
ou
```
🌍 [get-subscription] Ambiente Stripe: TEST
```

### Frontend:
Verifique qual chave está sendo usada ao criar o checkout:
- `pk_test_...` = TESTE
- `pk_live_...` = PRODUÇÃO

## 📋 Checklist

- [ ] Backend usando `sk_live_...` ou `sk_test_...`?
- [ ] Frontend usando `pk_live_...` ou `pk_test_...`?
- [ ] Ambos no mesmo ambiente? ✅
- [ ] Webhook secret corresponde ao ambiente?
- [ ] Customer IDs criados no mesmo ambiente?

## 🚨 Importante

**NÃO precisa apagar o usuário!** Apenas garanta que:
1. Frontend e backend usem o mesmo ambiente
2. O webhook secret corresponda ao ambiente
3. Faça um novo checkout após alinhar os ambientes

## 💡 Após Alinhar

1. O usuário faz um novo checkout
2. O checkout será criado no ambiente correto
3. O webhook processará corretamente
4. A subscription será encontrada pelo backend

