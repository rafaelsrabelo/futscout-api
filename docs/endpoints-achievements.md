# 📋 Documentação: Endpoints de Títulos e Conquistas (Achievements)

## 📅 Data da Atualização
**Data:** 2024-11-26  
**Versão da API:** Atual

---

## 🎯 Resumo das Mudanças

Foram adicionados **4 novos endpoints** para gerenciar títulos e conquistas dos atletas, além de atualizações nos endpoints de perfil para incluir os achievements.

### ✅ Novos Endpoints
- `POST /achievements` - Criar título
- `GET /achievements` - Listar meus títulos
- `PUT /achievements/:id` - Atualizar título
- `DELETE /achievements/:id` - Deletar título

### ✅ Endpoints Atualizados
- `GET /athletes/profile` - Agora inclui `achievements`
- `GET /athletes/:id` - Agora inclui `achievements`
- `GET /public/athletes/:id` - Agora inclui `achievements`

---

## 📝 Estrutura de Dados

### Achievement (Título/Conquista)

```typescript
interface Achievement {
  id: string
  name: string              // Nome do título (ex: "Campeonato Estadual")
  category: string          // Categoria (ex: "U19", "Sub-17", "Profissional")
  year: number              // Ano da conquista (ex: 2024)
  type: "COLLECTIVE" | "INDIVIDUAL"  // Tipo do título
  createdAt: Date
  updatedAt: Date
}
```

### Tipos de Título

- **COLLECTIVE**: Título coletivo (ex: campeonato conquistado com o time)
- **INDIVIDUAL**: Título individual (ex: melhor jogador, artilheiro)

---

## 🚀 Novos Endpoints

### 1. Criar Título

**Endpoint:** `POST /achievements`  
**Autenticação:** Requerida (Bearer Token)

#### CURL

```bash
curl -X POST "http://localhost:3333/achievements" \
  -H "Authorization: Bearer {seu-token-jwt}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Campeonato Estadual",
    "category": "U19",
    "year": 2024,
    "type": "COLLECTIVE"
  }'
```

#### Request Body

```json
{
  "name": "Campeonato Estadual",      // Obrigatório, string
  "category": "U19",                  // Obrigatório, string
  "year": 2024,                       // Obrigatório, número (1900 até ano atual + 1)
  "type": "COLLECTIVE"                // Obrigatório, "COLLECTIVE" ou "INDIVIDUAL"
}
```

#### Response (201 Created)

```json
{
  "achievement": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Campeonato Estadual",
    "category": "U19",
    "year": 2024,
    "type": "COLLECTIVE",
    "createdAt": "2024-11-26T12:00:00.000Z"
  }
}
```

#### Exemplo: Título Individual

```bash
curl -X POST "http://localhost:3333/achievements" \
  -H "Authorization: Bearer {seu-token-jwt}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Melhor Jogador",
    "category": "U19",
    "year": 2024,
    "type": "INDIVIDUAL"
  }'
```

#### Erros Possíveis

- **400 Bad Request**: Validação falhou (campos obrigatórios, ano inválido, tipo inválido)
- **404 Not Found**: Perfil de atleta não encontrado
- **500 Internal Server Error**: Erro interno do servidor

---

### 2. Listar Meus Títulos

**Endpoint:** `GET /achievements`  
**Autenticação:** Requerida (Bearer Token)

#### CURL

```bash
curl -X GET "http://localhost:3333/achievements" \
  -H "Authorization: Bearer {seu-token-jwt}" \
  -H "Content-Type: application/json"
```

#### Response (200 OK)

```json
{
  "achievements": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Campeonato Estadual",
      "category": "U19",
      "year": 2024,
      "type": "COLLECTIVE",
      "createdAt": "2024-11-26T12:00:00.000Z",
      "updatedAt": "2024-11-26T12:00:00.000Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Melhor Jogador",
      "category": "U19",
      "year": 2024,
      "type": "INDIVIDUAL",
      "createdAt": "2024-11-26T13:00:00.000Z",
      "updatedAt": "2024-11-26T13:00:00.000Z"
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "name": "Copa do Brasil",
      "category": "Sub-17",
      "year": 2023,
      "type": "COLLECTIVE",
      "createdAt": "2024-11-26T14:00:00.000Z",
      "updatedAt": "2024-11-26T14:00:00.000Z"
    }
  ]
}
```

**Nota:** Os títulos são ordenados por:
1. Ano (mais recente primeiro)
2. Data de criação (mais recente primeiro)

#### Erros Possíveis

- **404 Not Found**: Perfil de atleta não encontrado
- **500 Internal Server Error**: Erro interno do servidor

---

### 3. Atualizar Título

**Endpoint:** `PUT /achievements/:id`  
**Autenticação:** Requerida (Bearer Token)

#### CURL

```bash
curl -X PUT "http://localhost:3333/achievements/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer {seu-token-jwt}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Campeonato Estadual Sub-19",
    "category": "U19",
    "year": 2024,
    "type": "COLLECTIVE"
  }'
```

#### Request Body (todos os campos são opcionais)

```json
{
  "name": "Campeonato Estadual Sub-19",  // Opcional, string
  "category": "U19",                      // Opcional, string
  "year": 2024,                           // Opcional, número (1900 até ano atual + 1)
  "type": "COLLECTIVE"                    // Opcional, "COLLECTIVE" ou "INDIVIDUAL"
}
```

#### Response (200 OK)

```json
{
  "achievement": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Campeonato Estadual Sub-19",
    "category": "U19",
    "year": 2024,
    "type": "COLLECTIVE",
    "updatedAt": "2024-11-26T15:00:00.000Z"
  }
}
```

#### Erros Possíveis

- **400 Bad Request**: Validação falhou (ano inválido, tipo inválido)
- **403 Forbidden**: Não autorizado (título não pertence ao atleta)
- **404 Not Found**: Título não encontrado ou perfil de atleta não encontrado
- **500 Internal Server Error**: Erro interno do servidor

---

### 4. Deletar Título

**Endpoint:** `DELETE /achievements/:id`  
**Autenticação:** Requerida (Bearer Token)

#### CURL

```bash
curl -X DELETE "http://localhost:3333/achievements/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer {seu-token-jwt}" \
  -H "Content-Type: application/json"
```

#### Response (204 No Content)

Sem corpo de resposta.

#### Erros Possíveis

- **403 Forbidden**: Não autorizado (título não pertence ao atleta)
- **404 Not Found**: Título não encontrado ou perfil de atleta não encontrado
- **500 Internal Server Error**: Erro interno do servidor

---

## 🔄 Endpoints Atualizados

### 1. GET /athletes/profile

**Mudança:** Agora inclui o array `achievements` na resposta.

#### CURL

```bash
curl -X GET "http://localhost:3333/athletes/profile" \
  -H "Authorization: Bearer {seu-token-jwt}" \
  -H "Content-Type: application/json"
```

#### Response (200 OK) - Exemplo Parcial

```json
{
  "athleteProfile": {
    "id": "uuid-do-atleta",
    "nickname": "João Silva",
    "profilePhoto": "https://...",
    // ... outros campos do perfil ...
    
    "achievements": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Campeonato Estadual",
        "category": "U19",
        "year": 2024,
        "type": "COLLECTIVE",
        "createdAt": "2024-11-26T12:00:00.000Z",
        "updatedAt": "2024-11-26T12:00:00.000Z"
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "Melhor Jogador",
        "category": "U19",
        "year": 2024,
        "type": "INDIVIDUAL",
        "createdAt": "2024-11-26T13:00:00.000Z",
        "updatedAt": "2024-11-26T13:00:00.000Z"
      }
    ],
    
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-11-26T12:00:00.000Z"
  }
}
```

---

### 2. GET /athletes/:id

**Mudança:** Agora inclui o array `achievements` na resposta.

#### CURL

```bash
curl -X GET "http://localhost:3333/athletes/{athlete-id}" \
  -H "Authorization: Bearer {seu-token-jwt}" \
  -H "Content-Type: application/json"
```

#### Response (200 OK) - Exemplo Parcial

```json
{
  "athlete": {
    "id": "uuid-do-atleta",
    "nickname": "João Silva",
    "profilePhoto": "https://...",
    "favorites": 15,
    "isFavorite": false,
    "isPremium": true,
    
    "achievements": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Campeonato Estadual",
        "category": "U19",
        "year": 2024,
        "type": "COLLECTIVE",
        "createdAt": "2024-11-26T12:00:00.000Z",
        "updatedAt": "2024-11-26T12:00:00.000Z"
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "Melhor Jogador",
        "category": "U19",
        "year": 2024,
        "type": "INDIVIDUAL",
        "createdAt": "2024-11-26T13:00:00.000Z",
        "updatedAt": "2024-11-26T13:00:00.000Z"
      }
    ],
    
    "finishedMatches": [ ... ],
    "videoFeed": [ ... ]
  }
}
```

---

### 3. GET /public/athletes/:id

**Mudança:** Agora inclui o array `achievements` na resposta (endpoint público, sem autenticação).

#### CURL

```bash
curl -X GET "http://localhost:3333/public/athletes/{athlete-id}" \
  -H "Content-Type: application/json"
```

#### Response (200 OK) - Exemplo Parcial

```json
{
  "athlete": {
    "id": "uuid-do-atleta",
    "nickname": "João Silva",
    "profilePhoto": "https://...",
    "favorites": 15,
    "isFavorite": false,
    "isPremium": true,
    
    "achievements": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Campeonato Estadual",
        "category": "U19",
        "year": 2024,
        "type": "COLLECTIVE",
        "createdAt": "2024-11-26T12:00:00.000Z",
        "updatedAt": "2024-11-26T12:00:00.000Z"
      }
    ],
    
    "finishedMatches": [ ... ],
    "videoFeed": [ ... ]
  }
}
```

---

## 💡 Exemplos de Uso no Frontend

### Criar Título Coletivo

```typescript
const createCollectiveAchievement = async (data: {
  name: string
  category: string
  year: number
}) => {
  const response = await fetch('/achievements', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...data,
      type: 'COLLECTIVE',
    }),
  })
  
  return response.json()
}
```

### Criar Título Individual

```typescript
const createIndividualAchievement = async (data: {
  name: string
  category: string
  year: number
}) => {
  const response = await fetch('/achievements', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...data,
      type: 'INDIVIDUAL',
    }),
  })
  
  return response.json()
}
```

### Listar Títulos

```typescript
const listAchievements = async () => {
  const response = await fetch('/achievements', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })
  
  const { achievements } = await response.json()
  return achievements
}
```

### Filtrar Títulos por Tipo

```typescript
const achievements = await listAchievements()

const collectiveAchievements = achievements.filter(
  (a: Achievement) => a.type === 'COLLECTIVE'
)

const individualAchievements = achievements.filter(
  (a: Achievement) => a.type === 'INDIVIDUAL'
)
```

### Agrupar Títulos por Ano

```typescript
const achievementsByYear = achievements.reduce((acc, achievement) => {
  const year = achievement.year
  if (!acc[year]) {
    acc[year] = []
  }
  acc[year].push(achievement)
  return acc
}, {} as Record<number, Achievement[]>)
```

---

## 🔒 Regras de Negócio

1. **Apenas o atleta pode gerenciar seus próprios títulos**
   - Não é possível criar/editar/deletar títulos de outros atletas
   - Tentativas retornam erro 403 (Forbidden)

2. **Validação de Ano**
   - Ano deve ser entre 1900 e (ano atual + 1)
   - Exemplo: em 2024, anos válidos são 1900-2025

3. **Campos Obrigatórios na Criação**
   - `name`: obrigatório, string não vazia
   - `category`: obrigatório, string não vazia
   - `year`: obrigatório, número inteiro
   - `type`: obrigatório, "COLLECTIVE" ou "INDIVIDUAL"

4. **Ordenação**
   - Títulos são ordenados por ano (decrescente) e depois por data de criação (decrescente)

---

## 📊 TypeScript Types

```typescript
interface Achievement {
  id: string
  name: string
  category: string
  year: number
  type: 'COLLECTIVE' | 'INDIVIDUAL'
  createdAt: Date
  updatedAt: Date
}

interface CreateAchievementRequest {
  name: string
  category: string
  year: number
  type: 'COLLECTIVE' | 'INDIVIDUAL'
}

interface UpdateAchievementRequest {
  name?: string
  category?: string
  year?: number
  type?: 'COLLECTIVE' | 'INDIVIDUAL'
}

interface AthleteProfile {
  // ... outros campos ...
  achievements: Achievement[]
}
```

---

## 🧪 Casos de Teste Recomendados

### ✅ Casos de Sucesso

1. Criar título coletivo com dados válidos
2. Criar título individual com dados válidos
3. Listar todos os títulos do atleta
4. Atualizar título existente
5. Deletar título existente
6. Verificar se títulos aparecem no perfil

### ❌ Casos de Erro

1. Criar título sem campos obrigatórios (400)
2. Criar título com ano inválido (400)
3. Criar título com tipo inválido (400)
4. Atualizar título de outro atleta (403)
5. Deletar título de outro atleta (403)
6. Atualizar/deletar título inexistente (404)

---

## 📝 Notas Importantes

1. **Autenticação**: Todos os endpoints de CRUD requerem autenticação (exceto `GET /public/athletes/:id`)

2. **Ordenação**: Os achievements nos endpoints de perfil seguem a mesma ordenação (ano desc, createdAt desc)

3. **Compatibilidade**: Os endpoints de perfil continuam funcionando normalmente, apenas adicionando o campo `achievements`

4. **Valores Vazios**: Se o atleta não tiver títulos, o array `achievements` será `[]` (array vazio)

---

## 🔗 Referências

- **Base URL**: `http://localhost:3333` (desenvolvimento)
- **Autenticação**: Bearer Token (JWT)
- **Content-Type**: `application/json`

---

**Última atualização:** 2024-11-26

