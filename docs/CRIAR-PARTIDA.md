# 📋 Documentação: Criar Partida

## Endpoint

```
POST /api/matches
```

**Autenticação:** Requerida (JWT Token)

---

## 📦 Payload da Requisição

### Campos Obrigatórios

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `adversaryTeam` | `string` | Nome do time adversário |
| `date` | `string` (ISO 8601) | Data e hora da partida |

### Campos Condicionais

#### Time (Meu Time)

Você deve enviar **APENAS UMA** das opções abaixo:

**Opção 1: Usar time existente (recomendado)**
```json
{
  "myTeamId": "uuid-do-time"
}
```

**Opção 2: Criar time inline**
```json
{
  "myTeam": {
    "name": "Flamengo",
    "acronym": "FLA",              // opcional
    "shieldPhoto": "https://...",  // opcional
    "isPrincipal": false            // opcional (default: false)
  }
}
```

⚠️ **IMPORTANTE:** Não envie `myTeamId` e `myTeam` ao mesmo tempo!

#### Competição

Você pode enviar **APENAS UMA** das opções abaixo (ou nenhuma, para partida amistosa):

**Opção 1: Usar competição existente**
```json
{
  "competition_id": "uuid-da-competicao"
}
```

**Opção 2: Criar competição inline**
```json
{
  "competition": {
    "name": "Campeonato Brasileiro 2024",  // obrigatório
    "description": "...",                    // opcional
    "start_date": "2024-01-01T00:00:00Z",   // opcional
    "end_date": "2024-12-31T00:00:00Z",    // opcional
    "location": "Brasil",                    // opcional
    "modality": "FUT_11",                    // opcional
    "category": "PROFESSIONAL"                // opcional
  }
}
```

⚠️ **IMPORTANTE:** Não envie `competition_id` e `competition` ao mesmo tempo!

**Se não enviar competição:**
- `modality` se torna **obrigatório**
- `category` se torna **obrigatório**
- `location` se torna **obrigatório**

### Campos Opcionais

| Campo | Tipo | Valores Aceitos | Descrição |
|-------|------|-----------------|-----------|
| `modality` | `string` | `"FUT_11"`, `"FUT_7"`, `"FUTSAL"` | Modalidade (obrigatório se não tiver competição) |
| `category` | `string` | `"U5"` até `"U20"`, `"AMATEUR"`, `"PROFESSIONAL"` | Categoria (obrigatório se não tiver competição) |
| `location` | `string` | - | Local da partida (obrigatório se não tiver competição) |
| `streamUrl` | `string` (URL) | - | Link da transmissão |
| `status` | `string` | `"SCHEDULED"`, `"LIVE"`, `"FINISHED"`, `"CANCELLED"` | Status da partida (calculado automaticamente se não informado) |
| `result` | `string` | `"WIN"`, `"LOSS"`, `"DRAW"`, `"NOT_FINISHED"` | Resultado (calculado automaticamente pelo placar) |
| `myTeamScore` | `number` | ≥ 0 | Gols do meu time |
| `adversaryScore` | `number` | ≥ 0 | Gols do adversário |
| `playerPosition` | `string` | `"STARTER"`, `"SUBSTITUTE"` | Posição do jogador na partida |
| `observations` | `string` | - | Observações sobre a partida |
| `matchDuration` | `number` | 0-240 | Duração total da partida (minutos) |
| `approximateTime` | `number` | 0-240 | Tempo aproximado jogado pelo atleta (minutos) |
| `photoUrl` | `string` (URL) | - | URL da foto da partida |
| `videoUrl` | `string` (URL) | - | URL do vídeo da partida |
| `youtubeUrl` | `string` (URL) | - | Link do YouTube |
| `performanceRating` | `number` | 1-5 | Avaliação da performance (1 a 5 estrelas) |

---

## 🎯 Exemplos de Requisição

### Exemplo 1: Partida Passada (Já Finalizada) - Com Time e Competição Existentes

```json
POST /api/matches
Content-Type: application/json
Authorization: Bearer {token}

{
  "myTeamId": "eab61905-1ac2-4076-93a0-63a8fff0f437",
  "adversaryTeam": "Goiás",
  "date": "2025-12-02T16:47:21.000Z",
  "competition_id": "69e44d59-a5a0-43ec-96cf-168cfc642af7",
  "myTeamScore": 0,
  "adversaryScore": 2,
  "performanceRating": 4,
  "approximateTime": 10,
  "matchDuration": 60,
  "playerPosition": "SUBSTITUTE",
  "result": "LOSS"
}
```

**O que acontece:**
- ✅ Backend detecta que a data é passada e define `status: "FINISHED"` automaticamente
- ✅ Se você não enviar `result`, o backend calcula automaticamente baseado no placar
- ✅ Se a competição tiver `modality`, `category` e `location`, eles são usados automaticamente

---

### Exemplo 2: Partida Passada - Amistosa (Sem Competição)

```json
POST /api/matches
Content-Type: application/json
Authorization: Bearer {token}

{
  "myTeamId": "eab61905-1ac2-4076-93a0-63a8fff0f437",
  "adversaryTeam": "Goiás",
  "date": "2025-12-02T16:47:21.000Z",
  "modality": "FUTSAL",
  "category": "AMATEUR",
  "location": "Pv",
  "myTeamScore": 0,
  "adversaryScore": 2,
  "performanceRating": 4,
  "approximateTime": 10,
  "matchDuration": 60,
  "playerPosition": "SUBSTITUTE"
}
```

**O que acontece:**
- ✅ Backend detecta que a data é passada e define `status: "FINISHED"` automaticamente
- ✅ Backend calcula `result: "LOSS"` automaticamente pelo placar (0 < 2)
- ⚠️ `modality`, `category` e `location` são **obrigatórios** quando não há competição

---

### Exemplo 3: Criar Time Inline na Hora

```json
POST /api/matches
Content-Type: application/json
Authorization: Bearer {token}

{
  "myTeam": {
    "name": "Flamboyant",
    "acronym": "FLB",
    "isPrincipal": false
  },
  "adversaryTeam": "Goiás",
  "date": "2025-12-02T16:47:21.000Z",
  "modality": "FUTSAL",
  "category": "AMATEUR",
  "location": "Pv",
  "myTeamScore": 0,
  "adversaryScore": 2
}
```

**O que acontece:**
- ✅ Se já existir um time com o nome "Flamboyant" para o usuário, o existente é usado
- ✅ Se não existir, um novo time é criado automaticamente
- ✅ O time criado/encontrado é associado à partida

---

### Exemplo 4: Criar Competição Inline na Hora

```json
POST /api/matches
Content-Type: application/json
Authorization: Bearer {token}

{
  "myTeamId": "eab61905-1ac2-4076-93a0-63a8fff0f437",
  "adversaryTeam": "Goiás",
  "date": "2025-12-02T16:47:21.000Z",
  "competition": {
    "name": "Campeonato Municipal 2024"
  },
  "myTeamScore": 0,
  "adversaryScore": 2
}
```

**O que acontece:**
- ✅ Uma nova competição é criada com apenas o nome (outros campos são opcionais)
- ✅ A competição é associada à partida
- ⚠️ Se a competição não tiver `modality`, `category` e `location`, você precisa enviá-los no payload

---

### Exemplo 5: Partida Futura (Agendada)

```json
POST /api/matches
Content-Type: application/json
Authorization: Bearer {token}

{
  "myTeamId": "eab61905-1ac2-4076-93a0-63a8fff0f437",
  "adversaryTeam": "Goiás",
  "date": "2025-12-15T20:00:00.000Z",
  "competition_id": "69e44d59-a5a0-43ec-96cf-168cfc642af7",
  "status": "SCHEDULED"
}
```

**O que acontece:**
- ✅ Backend detecta que a data é futura e define `status: "SCHEDULED"` automaticamente
- ✅ `result` fica como `"NOT_FINISHED"` até a partida ser finalizada

---

## 🧠 Lógica Inteligente do Backend

### Detecção Automática de Status

O backend detecta automaticamente o status baseado na data:

- **Data passada** → `status: "FINISHED"`
- **Data futura** → `status: "SCHEDULED"`
- **Você pode sobrescrever** enviando `status` explicitamente

### Cálculo Automático de Resultado

Se você enviar placar mas não enviar `result`, o backend calcula automaticamente:

- `myTeamScore > adversaryScore` → `result: "WIN"`
- `myTeamScore < adversaryScore` → `result: "LOSS"`
- `myTeamScore === adversaryScore` → `result: "DRAW"`
- Sem placar → `result: "NOT_FINISHED"`

### Preenchimento Automático de Competição

Se você enviar `competition_id`, o backend tenta preencher automaticamente:

- Se a competição tiver `modality` e você não enviar → usa da competição
- Se a competição tiver `category` e você não enviar → usa da competição
- Se a competição tiver `location` e você não enviar → usa da competição

---

## ❌ Erros Comuns

### Erro 1: Enviar `myTeam` como string

❌ **ERRADO:**
```json
{
  "myTeam": "Flamboyant",  // ❌ String
  "myTeamId": "uuid..."
}
```

✅ **CORRETO:**
```json
{
  "myTeamId": "uuid..."  // ✅ Apenas UUID
}
```

OU

```json
{
  "myTeam": {  // ✅ Objeto
    "name": "Flamboyant"
  }
}
```

### Erro 2: Enviar ambos `myTeamId` e `myTeam`

❌ **ERRADO:**
```json
{
  "myTeamId": "uuid...",
  "myTeam": { "name": "..." }
}
```

✅ **CORRETO:**
```json
{
  "myTeamId": "uuid..."  // Apenas um
}
```

### Erro 3: Amistosa sem `modality`, `category` e `location`

❌ **ERRADO:**
```json
{
  "myTeamId": "uuid...",
  "adversaryTeam": "Goiás",
  "date": "2025-12-02T16:47:21.000Z"
  // ❌ Faltam modality, category e location
}
```

✅ **CORRETO:**
```json
{
  "myTeamId": "uuid...",
  "adversaryTeam": "Goiás",
  "date": "2025-12-02T16:47:21.000Z",
  "modality": "FUTSAL",      // ✅ Obrigatório
  "category": "AMATEUR",     // ✅ Obrigatório
  "location": "Pv"           // ✅ Obrigatório
}
```

---

## 📤 Resposta de Sucesso

```json
HTTP 201 Created

{
  "match": {
    "id": "uuid-da-partida",
    "athleteId": "uuid-do-atleta",
    "myTeamId": "uuid-do-time",
    "adversaryTeam": "Goiás",
    "date": "2025-12-02T16:47:21.000Z",
    "modality": "FUTSAL",
    "category": "AMATEUR",
    "location": "Pv",
    "status": "FINISHED",
    "result": "LOSS",
    "myTeamScore": 0,
    "adversaryScore": 2,
    "playerPosition": "SUBSTITUTE",
    "performanceRating": 4,
    "approximateTime": 10,
    "matchDuration": 60,
    "competitionId": "uuid-da-competicao",
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}
```

---

## 🚨 Respostas de Erro

### Erro 400: Validação

```json
HTTP 400 Bad Request

{
  "message": "Validation error",
  "issues": {
    "myTeam": {
      "_errors": ["Expected object, received string"]
    }
  },
  "details": [
    {
      "code": "invalid_type",
      "expected": "object",
      "received": "string",
      "path": ["myTeam"],
      "message": "Expected object, received string"
    }
  ]
}
```

### Erro 400: Time/Competição Duplicado

```json
HTTP 400 Bad Request

{
  "message": "Cannot provide both myTeamId and myTeam. Use one or the other."
}
```

### Erro 400: Campos Obrigatórios Faltando

```json
HTTP 400 Bad Request

{
  "message": "modality is required when competition_id or competition is not provided"
}
```

### Erro 404: Perfil de Atleta Não Encontrado

```json
HTTP 404 Not Found

{
  "message": "Athlete profile not found. Please create your athlete profile first."
}
```

---

## 💡 Dicas para o Frontend

### 1. Limpar Payload Antes de Enviar

```typescript
// Limpar campos desnecessários
const cleanPayload = {
  ...matchData,
}

// Se tem myTeamId, remover myTeam (se for string)
if (cleanPayload.myTeamId && typeof cleanPayload.myTeam === 'string') {
  delete cleanPayload.myTeam
}

// Se tem myTeam como objeto, remover myTeamId
if (cleanPayload.myTeam && typeof cleanPayload.myTeam === 'object') {
  delete cleanPayload.myTeamId
}

// Se tem competition_id, remover competition
if (cleanPayload.competition_id && cleanPayload.competition) {
  delete cleanPayload.competition
}
```

### 2. Detectar Partida Passada

```typescript
const isPastMatch = new Date(matchData.date) < new Date()

if (isPastMatch) {
  // Não precisa enviar status, o backend detecta automaticamente
  // Mas pode enviar result se quiser sobrescrever
}
```

### 3. Formato de Data

Sempre envie a data no formato ISO 8601:

```typescript
const date = new Date().toISOString()
// "2025-12-02T16:47:21.000Z"
```

---

## 📝 Checklist Antes de Enviar

- [ ] `adversaryTeam` está preenchido
- [ ] `date` está no formato ISO 8601
- [ ] Enviou `myTeamId` OU `myTeam` (objeto), não ambos
- [ ] Se enviou `myTeam`, é um objeto, não string
- [ ] Se não tem competição, enviou `modality`, `category` e `location`
- [ ] Se enviou `competition_id`, não enviou `competition`
- [ ] Se enviou `competition`, é um objeto com pelo menos `name`
- [ ] Removidos campos `undefined` ou `null` desnecessários

---

## 🔗 Endpoints Relacionados

- `GET /api/teams` - Listar meus times
- `POST /api/teams` - Criar time
- `GET /api/competitions` - Listar minhas competições
- `POST /api/competitions` - Criar competição

