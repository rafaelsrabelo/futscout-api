# 📊 Endpoints de Estatísticas e Contadores

## 🎯 Resumo dos Endpoints

### 1. **Número de Jogos Cadastrados**

**GET** `/api/matches`

**Autenticação:** Requerida (Bearer token)

**Query Params:**
- `status` (opcional): `SCHEDULED` | `LIVE` | `FINISHED` | `CANCELLED` | `ALL` (padrão: `ALL`)
- `includePlays` (opcional): `true` | `false` (padrão: `false`)

**Response:**
```json
{
  "matches": [
    {
      "type": "competition" | "friendly",
      "competition": {
        "id": "uuid",
        "name": "Nome da Competição",
        "description": "...",
        "startDate": "2025-01-01T00:00:00.000Z",
        "endDate": "2025-12-31T00:00:00.000Z"
      },
      "matches": [
        {
          "id": "uuid",
          "adversaryTeam": "Time Adversário",
          "myTeam": "Meu Time",
          "date": "2025-11-26T00:00:00.000Z",
          "result": "WIN" | "LOSS" | "DRAW" | "NOT_FINISHED",
          "plays": [...] // Se includePlays=true
        }
      ]
    }
  ],
  "total": 10  // ✅ Total de jogos cadastrados
}
```

**Exemplo:**
```bash
GET /api/matches?status=ALL
Authorization: Bearer {token}
```

---

### 2. **Número de Vídeos por Jogo**

**GET** `/api/matches/:id`

**Autenticação:** Requerida (Bearer token)

**Response:**
```json
{
  "match": {
    "id": "uuid",
    "adversaryTeam": "Time Adversário",
    "myTeam": "Meu Time",
    "date": "2025-11-26T00:00:00.000Z",
    "plays": [
      {
        "id": "uuid",
        "playType": "GOAL",
        "videoUrl": "https://...",
        "thumbnailUrl": "https://...",
        // ... outros campos
      }
    ]
  }
}
```

**Para contar vídeos:**
```javascript
const response = await fetch(`/api/matches/${matchId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
})
const { match } = await response.json()
const videoCount = match.plays.filter(p => p.videoUrl).length
```

**Ou usar com `includePlays=true`:**

**GET** `/api/matches?includePlays=true`

Retorna todos os jogos com seus plays, então você pode contar:

```javascript
const response = await fetch('/api/matches?includePlays=true', {
  headers: { 'Authorization': `Bearer ${token}` }
})
const { matches } = await response.json()

// Contar vídeos por jogo
matches.forEach(group => {
  group.matches.forEach(match => {
    const videoCount = match.plays?.filter(p => p.videoUrl).length || 0
    console.log(`Jogo ${match.id}: ${videoCount} vídeos`)
  })
})
```

---

### 3. **Vídeos no Feed**

**GET** `/api/videos/feed`

**Autenticação:** Requerida (Bearer token)

**Query Params:**
- `page` (opcional): número da página (padrão: 1)
- `limit` (opcional): itens por página (padrão: 20)

**Response:**
```json
{
  "videos": [
    {
      "id": "uuid",
      "videoUrl": "https://...",
      "thumbnailUrl": "https://...",
      "match": {
        "id": "uuid",
        "adversaryTeam": "Time Adversário",
        "myTeam": "Meu Time",
        "date": "2025-11-26T00:00:00.000Z",
        // ... outros campos
      } | null,  // null se for vídeo standalone
      "athlete": {
        "id": "uuid",
        "nickname": "Nome do Atleta",
        "profilePhoto": "https://..."
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalVideos": 100,  // ✅ Total de vídeos no feed
    "hasNextPage": true,
    "hasPrevPage": false,
    "limit": 20
  }
}
```

**Exemplo:**
```bash
GET /api/videos/feed?page=1&limit=20
Authorization: Bearer {token}
```

---

### 4. **Estatísticas Gerais (Recomendado para Dashboard)**

**GET** `/api/stats/general`

**Autenticação:** Requerida (Bearer token)

**Response:**
```json
{
  "stats": {
    "totalMatches": 10,  // ✅ Total de jogos finalizados
    "matchesByResult": {
      "wins": 7,
      "losses": 2,
      "draws": 1,
      "notFinished": 3
    },
    "totalPlays": 150,  // Total de lances (com e sem vídeo)
    "playsByType": {
      "goals": 25,
      "assists": 15,
      "saves": 10,
      // ... outros tipos
    },
    "averagePerMatch": {
      "goals": 2.5,
      "assists": 1.5,
      // ... outras médias
    }
  }
}
```

**Nota:** Este endpoint retorna estatísticas de jogos **finalizados** apenas.

---

## 📋 Resumo por Necessidade

| O que você precisa | Endpoint | Campo |
|-------------------|----------|-------|
| **Total de jogos cadastrados** | `GET /api/matches` | `total` |
| **Lista de jogos com vídeos** | `GET /api/matches?includePlays=true` | `matches[].matches[].plays[]` |
| **Vídeos por jogo específico** | `GET /api/matches/:id` | `match.plays[]` |
| **Total de vídeos no feed** | `GET /api/videos/feed` | `pagination.totalVideos` |
| **Lista de vídeos do feed** | `GET /api/videos/feed` | `videos[]` |
| **Estatísticas gerais** | `GET /api/stats/general` | `stats.*` |

---

## 💡 Exemplo Completo de Uso

```typescript
// 1. Buscar total de jogos
const matchesResponse = await fetch('/api/matches', {
  headers: { 'Authorization': `Bearer ${token}` }
})
const { total } = await matchesResponse.json()
console.log(`Total de jogos: ${total}`)

// 2. Buscar jogos com vídeos
const matchesWithPlays = await fetch('/api/matches?includePlays=true', {
  headers: { 'Authorization': `Bearer ${token}` }
})
const { matches } = await matchesWithPlays.json()

// Contar vídeos por jogo
matches.forEach(group => {
  group.matches.forEach(match => {
    const videoCount = match.plays?.filter(p => p.videoUrl).length || 0
    console.log(`Jogo ${match.id}: ${videoCount} vídeos`)
  })
})

// 3. Buscar total de vídeos no feed
const feedResponse = await fetch('/api/videos/feed', {
  headers: { 'Authorization': `Bearer ${token}` }
})
const { pagination } = await feedResponse.json()
console.log(`Total de vídeos no feed: ${pagination.totalVideos}`)
```

---

## 🎯 Recomendação

Para montar um componente com essas informações:

1. **Total de jogos:** `GET /api/matches` → `total`
2. **Vídeos por jogo:** `GET /api/matches?includePlays=true` → contar `plays` com `videoUrl`
3. **Total de vídeos no feed:** `GET /api/videos/feed` → `pagination.totalVideos`

Ou use `GET /api/stats/general` para estatísticas gerais (mas só conta jogos finalizados).

