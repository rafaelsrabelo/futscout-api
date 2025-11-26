# 📱 Mudanças no Frontend - Sistema de Limites

## ✅ O que mudou no endpoint de subscription

O endpoint `GET /api/billing/subscription` agora retorna informações mais detalhadas sobre o uso.

### Response Atualizado

```json
{
  "subscription": {
    "id": "uuid",
    "status": "active",
    "currentPeriodEnd": "2025-12-26T14:24:00.000Z",
    "createdAt": "2025-11-26T14:24:00.000Z"
  },
  "plan": {
    "id": "uuid",
    "name": "FREE",
    "price": 0,
    "currency": "BRL",
    "monthlyLimitMatches": 5,
    "monthlyLimitVideos": null,  // ⚠️ NOVO: null = ilimitado (só conta)
    "monthlyLimitStandaloneVideos": 5,  // ⚠️ NOVO: limite de vídeos standalone
    "isUnlimited": false
  },
  "usage": {
    "matchesUsed": 3,  // Quantos jogos criados este mês
    "videosUsed": 12,  // Quantos vídeos dentro de jogos criados este mês
    "standaloneVideosUsed": 2,  // ⚠️ NOVO: quantos vídeos standalone criados este mês
    "month": 11,
    "year": 2025
  }
}
```

## 📊 Como montar o componente de uso

### Exemplo de Componente React Native

```typescript
import React, { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'

interface UsageData {
  matchesUsed: number
  videosUsed: number
  standaloneVideosUsed: number
  month: number
  year: number
}

interface PlanData {
  name: string
  monthlyLimitMatches: number | null
  monthlyLimitVideos: number | null
  monthlyLimitStandaloneVideos: number | null
  isUnlimited: boolean
}

function UsageComponent() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [plan, setPlan] = useState<PlanData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsage()
  }, [])

  async function loadUsage() {
    try {
      const response = await fetch('https://futscout-api.onrender.com/api/billing/subscription', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      
      const data = await response.json()
      setUsage(data.usage)
      setPlan(data.plan)
    } catch (error) {
      console.error('Erro ao carregar uso:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <ActivityIndicator />
  }

  if (!usage || !plan) {
    return <Text>Erro ao carregar dados</Text>
  }

  // Se for PREMIUM, mostrar como ilimitado
  if (plan.isUnlimited) {
    return (
      <View>
        <Text>Plano: {plan.name}</Text>
        <Text>✅ Ilimitado</Text>
        <Text>Jogos criados: {usage.matchesUsed}</Text>
        <Text>Vídeos em jogos: {usage.videosUsed}</Text>
        <Text>Vídeos standalone: {usage.standaloneVideosUsed}</Text>
      </View>
    )
  }

  // Se for FREE, mostrar limites
  return (
    <View>
      <Text>Plano: {plan.name}</Text>
      
      {/* Jogos */}
      <View>
        <Text>Jogos</Text>
        <Text>
          {usage.matchesUsed} / {plan.monthlyLimitMatches || '∞'}
        </Text>
        <View style={{ 
          width: '100%', 
          height: 8, 
          backgroundColor: '#e0e0e0',
          borderRadius: 4 
        }}>
          <View style={{
            width: `${(usage.matchesUsed / (plan.monthlyLimitMatches || 1)) * 100}%`,
            height: '100%',
            backgroundColor: usage.matchesUsed >= (plan.monthlyLimitMatches || 0) 
              ? '#f44336' 
              : '#4caf50',
            borderRadius: 4
          }} />
        </View>
      </View>

      {/* Vídeos dentro de jogos (não limitado no FREE) */}
      <View>
        <Text>Vídeos em Jogos</Text>
        <Text>{usage.videosUsed} (ilimitado)</Text>
      </View>

      {/* Vídeos Standalone */}
      <View>
        <Text>Lances Standalone</Text>
        <Text>
          {usage.standaloneVideosUsed} / {plan.monthlyLimitStandaloneVideos || '∞'}
        </Text>
        <View style={{ 
          width: '100%', 
          height: 8, 
          backgroundColor: '#e0e0e0',
          borderRadius: 4 
        }}>
          <View style={{
            width: `${(usage.standaloneVideosUsed / (plan.monthlyLimitStandaloneVideos || 1)) * 100}%`,
            height: '100%',
            backgroundColor: usage.standaloneVideosUsed >= (plan.monthlyLimitStandaloneVideos || 0) 
              ? '#f44336' 
              : '#4caf50',
            borderRadius: 4
          }} />
        </View>
      </View>
    </View>
  )
}
```

## 📋 Resumo das Informações Disponíveis

### No endpoint `GET /api/billing/subscription`:

| Campo | Descrição |
|-------|-----------|
| `usage.matchesUsed` | Quantos jogos foram criados este mês |
| `usage.videosUsed` | Quantos vídeos dentro de jogos foram criados este mês |
| `usage.standaloneVideosUsed` | Quantos vídeos standalone foram criados este mês |
| `plan.monthlyLimitMatches` | Limite de jogos (5 no FREE, null no PREMIUM) |
| `plan.monthlyLimitVideos` | Limite de vídeos em jogos (null = ilimitado no FREE) |
| `plan.monthlyLimitStandaloneVideos` | Limite de vídeos standalone (5 no FREE, null no PREMIUM) |

## 🎨 Exemplo Visual de Componente

```
┌─────────────────────────────────┐
│  Plano: FREE                    │
├─────────────────────────────────┤
│  Jogos                           │
│  3 / 5  [████████░░] 60%        │
├─────────────────────────────────┤
│  Vídeos em Jogos                │
│  12 (ilimitado)                 │
├─────────────────────────────────┤
│  Lances Standalone              │
│  2 / 5  [████░░░░░░] 40%        │
└─────────────────────────────────┘
```

## ⚠️ Campos que mudaram

1. **`plan.monthlyLimitVideos`**: Agora é `null` no FREE (vídeos em jogos são ilimitados)
2. **`plan.monthlyLimitStandaloneVideos`**: Novo campo (limite de vídeos standalone)
3. **`usage.standaloneVideosUsed`**: Novo campo (contador de vídeos standalone)

## 🔄 Compatibilidade

- Se o frontend não tratar `standaloneVideosUsed`, não vai quebrar (só não vai mostrar)
- Se o frontend não tratar `monthlyLimitStandaloneVideos`, não vai quebrar
- `monthlyLimitVideos` sendo `null` pode quebrar se o frontend esperar sempre um número

**Recomendação:** Sempre verificar se os valores são `null` antes de usar.

