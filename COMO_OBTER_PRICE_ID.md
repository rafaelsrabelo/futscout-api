# 📋 Como Obter o Price ID do Stripe

## 🔍 Passo a Passo

### 1. Acesse o Stripe Dashboard
- Acesse: https://dashboard.stripe.com/test/products (modo teste)
- Ou: https://dashboard.stripe.com/products (modo produção)

### 2. Encontre o Produto
- Procure pelo produto "Plano Premium FutScore" ou o nome que você deu
- Clique no produto

### 3. Veja os Preços
- Na página do produto, você verá uma seção "Preços" (Prices)
- Clique no preço que você criou (ex: R$ 29,90)

### 4. Copie o Price ID
- Na página do preço, você verá o **Price ID** no topo
- Ele começa com `price_` (ex: `price_1SXlnqL1d3Ap7XCDF0krnX7P`)
- **IMPORTANTE**: Você precisa do **Price ID**, não do **Product ID**!

## ⚠️ Diferença Importante

- **Product ID**: `prod_xxxxx` → Identifica o produto (não serve)
- **Price ID**: `price_xxxxx` → Identifica o preço específico (é isso que precisamos!)

## ✅ Depois de Obter o Price ID

Execute o script para atualizar o banco:

```bash
tsx scripts/update-premium-price.ts price_xxxxx
```

Substitua `price_xxxxx` pelo Price ID real que você copiou do Stripe.

## 🎯 Exemplo

Se o Price ID for `price_1ABC123XYZ456`, execute:

```bash
tsx scripts/update-premium-price.ts price_1ABC123XYZ456
```

## ✅ Verificar se Funcionou

Depois de atualizar, verifique:

```bash
tsx scripts/check-premium-plan.ts
```

Deve mostrar:
```
✅ Plano PREMIUM está configurado corretamente!
   Price ID: price_xxxxx
```

