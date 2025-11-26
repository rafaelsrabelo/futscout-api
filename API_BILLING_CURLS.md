# 📡 API de Billing - Guia Completo com cURLs

Este documento contém todos os endpoints de billing com exemplos de `curl` e explicações de como usar as informações para mostrar o status do plano FREE ao usuário.

---

## 🔑 Autenticação

Todos os endpoints protegidos precisam do token JWT no header:

```bash
Authorization: Bearer {seu_token_jwt}
```

**Como obter o token:**
```bash
# Login
curl -X POST https://futscout-api.onrender.com/api/auth/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@email.com",
    "password": "senha123"
  }'

# Response contém o token
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "..."
}
```

---

## 📋 Endpoints Disponíveis

### 1. Listar Planos Disponíveis

**GET** `/api/billing/plans`

**Autenticação:** Não requerida (pública)

**cURL:**
```bash
curl -X GET https://futscout-api.onrender.com/api/billing/plans \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "plans": [
    {
      "id": "6d60c3fc-4fe2-4eac-89b7-c30e84c7a74f",
      "name": "FREE",
      "price": 0,
      "currency": "BRL",
      "monthlyLimitMatches": 5,
      "monthlyLimitVideos": null,
      "monthlyLimitStandaloneVideos": 5,
      "isUnlimited": false
    },
    {
      "id": "27491b63-56d2-45da-aaf4-8ec390f8c1ee",
      "name": "PREMIUM",
      "price": 2990,
      "currency": "BRL",
      "monthlyLimitMatches": null,
      "monthlyLimitVideos": null,
      "monthlyLimitStandaloneVideos": null,
      "isUnlimited": true
    }
  ]
}
```

**Quando usar:**
- Mostrar planos disponíveis na tela de assinatura
- Exibir preços e limites de cada plano

---

### 2. Verificar Assinatura e Uso Atual

**GET** `/api/billing/subscription`

**Autenticação:** Requerida (Bearer token)

**cURL:**
```bash
curl -X GET https://futscout-api.onrender.com/api/billing/subscription \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {seu_token}"
```

**Response (Plano FREE):**
```json
{
  "subscription": null,
  "plan": {
    "id": "6d60c3fc-4fe2-4eac-89b7-c30e84c7a74f",
    "name": "FREE",
    "price": 0,
    "currency": "BRL",
    "monthlyLimitMatches": 5,
    "monthlyLimitVideos": null,
    "monthlyLimitStandaloneVideos": 5,
    "isUnlimited": false
  },
  "usage": {
    "matchesUsed": 3,
    "videosUsed": 12,
    "standaloneVideosUsed": 2,
    "month": 11,
    "year": 2025
  }
}
```

**Response (Plano PREMIUM):**
```json
{
  "subscription": {
    "id": "uuid-da-assinatura",
    "status": "active",
    "currentPeriodEnd": "2025-12-26T14:24:00.000Z",
    "createdAt": "2025-11-26T14:24:00.000Z"
  },
  "plan": {
    "id": "27491b63-56d2-45da-aaf4-8ec390f8c1ee",
    "name": "PREMIUM",
    "price": 2990,
    "currency": "BRL",
    "monthlyLimitMatches": null,
    "monthlyLimitVideos": null,
    "monthlyLimitStandaloneVideos": null,
    "isUnlimited": true
  },
  "usage": {
    "matchesUsed": 10,
    "videosUsed": 50,
    "standaloneVideosUsed": 15,
    "month": 11,
    "year": 2025
  }
}
```

**Quando usar:**
- ✅ **PRINCIPAL**: Mostrar status do plano FREE ao usuário
- Verificar quantos jogos/vídeos já foram criados
- Verificar se está dentro ou fora do limite
- Mostrar quando a assinatura expira (se PREMIUM)

---

### 3. Obter Chave Publicável do Stripe

**GET** `/api/billing/stripe-config`

**Autenticação:** Não requerida (pública)

**cURL:**
```bash
curl -X GET https://futscout-api.onrender.com/api/billing/stripe-config \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "publishableKey": "pk_test_51SX7zFL1d3A..."
}
```

**Quando usar:**
- Inicializar Stripe.js no frontend (opcional)
- Geralmente não é necessário para checkout

---

### 4. Criar Checkout (Iniciar Pagamento)

**POST** `/api/billing/checkout`

**Autenticação:** Requerida (Bearer token)

**cURL:**
```bash
curl -X POST https://futscout-api.onrender.com/api/billing/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {seu_token}" \
  -d '{
    "planId": "27491b63-56d2-45da-aaf4-8ec390f8c1ee",
    "successUrl": "futscout://payment/success?session_id={CHECKOUT_SESSION_ID}",
    "cancelUrl": "futscout://payment/cancel"
  }'
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_xxxxx",
  "sessionId": "cs_test_xxxxx"
}
```

**Quando usar:**
- Quando usuário clica em "Assinar Premium"
- Abrir WebView com a URL retornada

---

### 5. Abrir Portal de Billing (Gerenciar Assinatura)

**POST** `/api/billing/portal`

**Autenticação:** Requerida (Bearer token)

**cURL:**
```bash
curl -X POST https://futscout-api.onrender.com/api/billing/portal \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {seu_token}" \
  -d '{
    "returnUrl": "futscout://profile"
  }'
```

**Response:**
```json
{
  "url": "https://billing.stripe.com/p/session/xxxxx"
}
```

**Quando usar:**
- Quando usuário quer gerenciar assinatura (cancelar, atualizar cartão, etc.)
- Abrir WebView com a URL retornada

---

## 📊 Como Mostrar Status do Plano FREE ao Usuário

### Exemplo de Componente React Native

```typescript
import React, { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native'

interface SubscriptionData {
  subscription: {
    id: string
    status: string
    currentPeriodEnd: string
  } | null
  plan: {
    name: string
    monthlyLimitMatches: number | null
    monthlyLimitVideos: number | null
    monthlyLimitStandaloneVideos: number | null
    isUnlimited: boolean
  }
  usage: {
    matchesUsed: number
    videosUsed: number
    standaloneVideosUsed: number
    month: number
    year: number
  }
}

function PlanStatusComponent() {
  const [data, setData] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSubscriptionStatus()
  }, [])

  async function loadSubscriptionStatus() {
    try {
      const response = await fetch(
        'https://futscout-api.onrender.com/api/billing/subscription',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )
      const subscriptionData = await response.json()
      setData(subscriptionData)
    } catch (error) {
      console.error('Erro ao carregar status:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <ActivityIndicator />
  }

  if (!data) {
    return <Text>Erro ao carregar dados</Text>
  }

  const { plan, usage, subscription } = data

  // Se for PREMIUM, mostrar como ilimitado
  if (plan.isUnlimited) {
    return (
      <View style={styles.container}>
        <Text style={styles.planName}>Plano: {plan.name}</Text>
        <Text style={styles.unlimited}>✅ Ilimitado</Text>
        <Text>Jogos criados: {usage.matchesUsed}</Text>
        <Text>Vídeos em jogos: {usage.videosUsed}</Text>
        <Text>Vídeos standalone: {usage.standaloneVideosUsed}</Text>
        {subscription && (
          <Text>
            Renovação: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
          </Text>
        )}
      </View>
    )
  }

  // Se for FREE, mostrar limites e uso
  return (
    <View style={styles.container}>
      <Text style={styles.planName}>Plano: {plan.name}</Text>
      
      {/* Jogos */}
      <View style={styles.limitCard}>
        <View style={styles.limitHeader}>
          <Text style={styles.limitLabel}>Jogos Cadastrados</Text>
          <Text style={styles.limitValue}>
            {usage.matchesUsed} / {plan.monthlyLimitMatches || '∞'}
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${(usage.matchesUsed / (plan.monthlyLimitMatches || 1)) * 100}%`,
                backgroundColor:
                  usage.matchesUsed >= (plan.monthlyLimitMatches || 0)
                    ? '#f44336'
                    : '#4caf50',
              },
            ]}
          />
        </View>
        {usage.matchesUsed >= (plan.monthlyLimitMatches || 0) && (
          <Text style={styles.warning}>
            ⚠️ Limite atingido! Assine o PREMIUM para criar mais jogos.
          </Text>
        )}
      </View>

      {/* Vídeos em Jogos */}
      <View style={styles.limitCard}>
        <View style={styles.limitHeader}>
          <Text style={styles.limitLabel}>Vídeos em Jogos</Text>
          <Text style={styles.limitValue}>
            {usage.videosUsed} (ilimitado)
          </Text>
        </View>
        <Text style={styles.info}>
          Você pode adicionar quantos vídeos quiser aos seus jogos.
        </Text>
      </View>

      {/* Vídeos Standalone */}
      <View style={styles.limitCard}>
        <View style={styles.limitHeader}>
          <Text style={styles.limitLabel}>Lances Standalone</Text>
          <Text style={styles.limitValue}>
            {usage.standaloneVideosUsed} / {plan.monthlyLimitStandaloneVideos || '∞'}
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${(usage.standaloneVideosUsed / (plan.monthlyLimitStandaloneVideos || 1)) * 100}%`,
                backgroundColor:
                  usage.standaloneVideosUsed >= (plan.monthlyLimitStandaloneVideos || 0)
                    ? '#f44336'
                    : '#4caf50',
              },
            ]}
          />
        </View>
        {usage.standaloneVideosUsed >= (plan.monthlyLimitStandaloneVideos || 0) && (
          <Text style={styles.warning}>
            ⚠️ Limite atingido! Assine o PREMIUM para criar mais lances standalone.
          </Text>
        )}
      </View>

      {/* Botão para assinar PREMIUM */}
      {(!plan.isUnlimited) && (
        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={handleUpgrade}
        >
          <Text style={styles.upgradeButtonText}>
            Assinar PREMIUM - R$ 29,90/mês
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = {
  container: {
    padding: 20,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  unlimited: {
    fontSize: 18,
    color: '#4caf50',
    marginBottom: 10,
  },
  limitCard: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  limitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  limitLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  limitValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  warning: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 5,
  },
  info: {
    color: '#666',
    fontSize: 12,
    marginTop: 5,
  },
  upgradeButton: {
    backgroundColor: '#4caf50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}
```

---

## 📊 Exemplo Visual do Componente

```
┌─────────────────────────────────────┐
│  Plano: FREE                        │
├─────────────────────────────────────┤
│  Jogos Cadastrados                  │
│  3 / 5  [████████░░] 60%           │
│                                     │
│  Vídeos em Jogos                    │
│  12 (ilimitado)                     │
│  Você pode adicionar quantos        │
│  vídeos quiser aos seus jogos.      │
│                                     │
│  Lances Standalone                  │
│  2 / 5  [████░░░░░░] 40%           │
│                                     │
│  [Assinar PREMIUM - R$ 29,90/mês]   │
└─────────────────────────────────────┘
```

---

## 🔄 Fluxo Completo para Mostrar Status

### 1. Carregar Status ao Abrir Tela

```typescript
// Ao montar componente ou entrar na tela
useEffect(() => {
  loadSubscriptionStatus()
}, [])

async function loadSubscriptionStatus() {
  const response = await fetch(
    'https://futscout-api.onrender.com/api/billing/subscription',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  )
  const data = await response.json()
  setSubscriptionData(data)
}
```

### 2. Calcular Percentuais

```typescript
// Para jogos
const matchesPercentage = plan.monthlyLimitMatches
  ? (usage.matchesUsed / plan.monthlyLimitMatches) * 100
  : 0

// Para vídeos standalone
const standalonePercentage = plan.monthlyLimitStandaloneVideos
  ? (usage.standaloneVideosUsed / plan.monthlyLimitStandaloneVideos) * 100
  : 0
```

### 3. Verificar se Está no Limite

```typescript
const isMatchesLimitReached = plan.monthlyLimitMatches
  ? usage.matchesUsed >= plan.monthlyLimitMatches
  : false

const isStandaloneLimitReached = plan.monthlyLimitStandaloneVideos
  ? usage.standaloneVideosUsed >= plan.monthlyLimitStandaloneVideos
  : false
```

### 4. Mostrar Mensagens

```typescript
if (isMatchesLimitReached) {
  // Mostrar: "Limite de jogos atingido! Assine PREMIUM"
}

if (isStandaloneLimitReached) {
  // Mostrar: "Limite de lances standalone atingido! Assine PREMIUM"
}
```

---

## 📋 Resumo dos Campos Importantes

### Para Mostrar ao Usuário:

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| `plan.name` | Nome do plano | "FREE" ou "PREMIUM" |
| `plan.isUnlimited` | Se é ilimitado | `true` = PREMIUM, `false` = FREE |
| `usage.matchesUsed` | Jogos criados este mês | 3 |
| `plan.monthlyLimitMatches` | Limite de jogos | 5 (FREE) ou `null` (PREMIUM) |
| `usage.videosUsed` | Vídeos em jogos criados este mês | 12 |
| `plan.monthlyLimitVideos` | Limite de vídeos em jogos | `null` = ilimitado |
| `usage.standaloneVideosUsed` | Vídeos standalone criados este mês | 2 |
| `plan.monthlyLimitStandaloneVideos` | Limite de vídeos standalone | 5 (FREE) ou `null` (PREMIUM) |

---

## 🎯 Exemplo de Uso Completo

```typescript
// 1. Carregar dados
const { plan, usage } = await fetchSubscription()

// 2. Calcular informações
const matchesInfo = {
  used: usage.matchesUsed,
  limit: plan.monthlyLimitMatches || Infinity,
  percentage: plan.monthlyLimitMatches
    ? (usage.matchesUsed / plan.monthlyLimitMatches) * 100
    : 0,
  isLimitReached: plan.monthlyLimitMatches
    ? usage.matchesUsed >= plan.monthlyLimitMatches
    : false,
}

const standaloneInfo = {
  used: usage.standaloneVideosUsed,
  limit: plan.monthlyLimitStandaloneVideos || Infinity,
  percentage: plan.monthlyLimitStandaloneVideos
    ? (usage.standaloneVideosUsed / plan.monthlyLimitStandaloneVideos) * 100
    : 0,
  isLimitReached: plan.monthlyLimitStandaloneVideos
    ? usage.standaloneVideosUsed >= plan.monthlyLimitStandaloneVideos
    : false,
}

// 3. Mostrar na UI
<View>
  <Text>Jogos: {matchesInfo.used}/{matchesInfo.limit}</Text>
  <ProgressBar value={matchesInfo.percentage} />
  
  <Text>Vídeos Standalone: {standaloneInfo.used}/{standaloneInfo.limit}</Text>
  <ProgressBar value={standaloneInfo.percentage} />
  
  {standaloneInfo.isLimitReached && (
    <Text>⚠️ Limite atingido! Assine PREMIUM</Text>
  )}
</View>
```

---

## ✅ Checklist para Implementação

- [ ] Criar componente de status do plano
- [ ] Buscar dados de `/api/billing/subscription`
- [ ] Calcular percentuais de uso
- [ ] Mostrar barras de progresso
- [ ] Mostrar mensagens quando no limite
- [ ] Adicionar botão para assinar PREMIUM
- [ ] Atualizar dados quando usuário cria/deleta conteúdo

---

## 🔗 URLs Base

**Produção:**
```
https://futscout-api.onrender.com/api
```

**Desenvolvimento:**
```
http://localhost:3333/api
```

---

## 📝 Notas Importantes

1. **Vídeos em jogos são ilimitados** no plano FREE (`monthlyLimitVideos: null`)
2. **Apenas vídeos standalone têm limite** (5 no FREE)
3. **Contadores resetam automaticamente** no primeiro dia do mês
4. **Ao deletar vídeo/jogo**, o contador é decrementado automaticamente
5. **Usuários sem assinatura** são automaticamente tratados como FREE

