# 🎯 Admin — Lances, Vídeos e Partidas (Frontend)

Guia de integração para o painel admin gerenciar partidas, lances e vídeos dos atletas. Cobre dois fluxos:

- **Fluxo A:** partir do perfil do atleta (tabs Partidas / Lances) → adicionar lance → anexar vídeo.
- **Fluxo B:** partir da busca global de partidas → abrir partida → adicionar lance → anexar vídeo.

Todos os endpoints abaixo exigem `Authorization: Bearer <accessToken>` com `role = 'ADMIN'`. Veja `docs/FRONTEND-AUTH-ADMIN.md`.

---

## 📍 Mapa rápido de endpoints

### Lista e detalhe do atleta
| Uso | Método | Path |
|---|---|---|
| Lista de atletas (busca) | `GET` | `/api/admin/athletes` |
| Detalhe do atleta (header/overview) | `GET` | `/api/admin/athletes/:id` |

### Tabs da tela do atleta (`/admin/atletas/:id/...`)
| Tab | Método | Path |
|---|---|---|
| **Partidas** | `GET` | `/api/admin/athletes/:athleteId/matches` |
| **Lances** | `GET` | `/api/admin/athletes/:athleteId/plays` |
| **Conquistas** | `GET` | `/api/admin/athletes/:athleteId/achievements` |
| **Times** | `GET` | `/api/admin/athletes/:athleteId/team-history` |

### Partidas (busca global)
| Uso | Método | Path |
|---|---|---|
| Busca global de partidas | `GET` | `/api/admin/matches` |
| Detalhe da partida | `GET` | `/api/admin/matches/:id` |
| Lances da partida | `GET` | `/api/admin/matches/:id/plays` |

### Escrita (mutações)
| Uso | Método | Path |
|---|---|---|
| Admin cria lance em qualquer partida | `POST` | `/api/admin/matches/:matchId/plays` |
| Admin gera presigned R2 URL | `GET` | `/api/admin/videos/upload-url` |
| Admin anexa/substitui vídeo em um lance | `PUT` | `/api/admin/plays/:id/video-url` |
| Admin edita placar / resultado | `PATCH` | `/api/admin/matches/:id/result` |
| Admin reatribui partida a outro atleta | `POST` | `/api/admin/matches/:id/link-athlete` |

---

## 🧭 Fluxo A — A partir do perfil do atleta

URL frontend de exemplo: `https://www.futscore.club/admin/atletas/:id/partidas`

### Passo 1 — Listar partidas do atleta

```
GET /api/admin/athletes/:athleteId/matches?page=1&pageSize=20&status=FINISHED
```

**Query params:**

| Param | Tipo | Default |
|---|---|---|
| `page` | int ≥ 1 | `1` |
| `pageSize` | int 1–100 | `20` |
| `competitionId` | uuid | — |
| `status` | `SCHEDULED \| LIVE \| FINISHED \| CANCELLED` | — |
| `result` | `WIN \| LOSS \| DRAW \| NOT_FINISHED` | — |
| `from` | ISO date | — |
| `to` | ISO date | — |

**Resposta (200):**

```json
{
  "items": [
    {
      "id": "uuid-match",
      "date": "2025-05-01T20:30:00.000Z",
      "adversaryTeam": "Palmeiras",
      "myTeamScore": 2,
      "adversaryScore": 1,
      "status": "FINISHED",
      "result": "WIN",
      "playsCount": 7,
      "competition": { "id": "uuid-comp", "name": "Campeonato Estadual" },
      "athleteId": "uuid-athlete",
      "myTeamId": "uuid-team",
      "modality": "FUT_11",
      "category": "U20",
      "location": "Allianz Parque"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 43,
  "hasMore": true
}
```

**Erros:**
- `404 { "message": "Atleta não encontrado." }` se o `athleteId` não existe.

### Passo 2 — (Opcional) Listar lances que ainda não têm vídeo

```
GET /api/admin/athletes/:athleteId/plays?hasVideo=false&pageSize=50
```

**Query params:**

| Param | Tipo | Notas |
|---|---|---|
| `page` / `pageSize` | int | default 1 / 20 |
| `hasVideo` | boolean | `true` = só com vídeo, `false` = só sem vídeo |
| `playType` | enum `PlayType` | `GOAL`, `ASSIST`, `DRIBBLE`, etc. |
| `matchId` | uuid | filtra lances de uma partida específica |
| `from` / `to` | ISO date | recorte por `createdAt` |

**Resposta (200):**

```json
{
  "items": [
    {
      "id": "uuid-play",
      "playType": "GOAL",
      "videoUrl": null,
      "thumbnailUrl": null,
      "photoUrl": null,
      "rating": null,
      "observations": "Chute de fora da área",
      "classifications": [
        { "id": "uuid-c", "playId": "uuid-play", "classification": "TECHNICAL" }
      ],
      "createdAt": "2025-05-01T20:45:00.000Z",
      "match": { "id": "uuid-match", "date": "2025-05-01T20:30:00.000Z", "adversaryTeam": "Palmeiras" }
    }
  ],
  "page": 1, "pageSize": 50, "total": 3, "hasMore": false
}
```

### Passo 3 — Criar um novo lance em uma partida

```
POST /api/admin/matches/:matchId/plays
Content-Type: application/json

{
  "playType": "GOAL",
  "videoUrl": "https://cdn.r2.futscout.../videos/xyz.mp4",   // opcional
  "thumbnailUrl": null,                                      // opcional
  "photoUrl": null,
  "rating": 5,
  "observations": "Gol de cabeça aos 42'",
  "classifications": ["TECHNICAL", "PHYSICAL"]
}
```

**Resposta (201):**

```json
{ "play": { "id": "uuid-play", "playType": "GOAL", "videoUrl": "...", "classifications": [...] } }
```

**Comportamento:**
- Se `videoUrl` presente e `thumbnailUrl` ausente → thumbnail é gerado em background (setTimeout). Frontend pode fazer refetch após alguns segundos pra renderizar.
- Admin **não** consome cota de vídeo do atleta.

**Erros:**
- `404 { "message": "Match not found" }` se a partida não existe.
- `400` — erro de validação Zod (playType inválido, rating fora de 1–5, etc.).

### Passo 4 — Anexar vídeo a um lance existente (upload direto R2)

O upload **não passa pelo backend** — presigned URL direto pro R2, depois o backend só persiste a URL final.

#### 4.1 — Pegar presigned URL

```
GET /api/admin/videos/upload-url?filename=lance-goal-xyz.mp4&expiresIn=3600
```

**Query params:**

| Param | Tipo | Default |
|---|---|---|
| `filename` | string 1–255 | — |
| `expiresIn` | int 60–3600 (segundos) | `3600` |

**Resposta (200):**

```json
{
  "uploadUrl": "https://....r2.cloudflarestorage.com/...",
  "publicUrl": "https://cdn.r2.futscout.../videos/uuid-xyz.mp4",
  "key": "videos/uuid-xyz.mp4",
  "expiresIn": 3600,
  "instructions": {
    "method": "PUT",
    "headers": { "Content-Type": "video/mp4" }
  }
}
```

#### 4.2 — Upload direto do frontend pro R2

```ts
await fetch(uploadUrl, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': instructions.headers['Content-Type'] }
})
```

#### 4.3 — Persistir a URL final no lance

```
PUT /api/admin/plays/:id/video-url
Content-Type: application/json

{
  "videoUrl": "https://cdn.r2.futscout.../videos/uuid-xyz.mp4",
  "thumbnailUrl": null                        // opcional; se null, backend gera async
}
```

**Resposta (200):**

```json
{ "play": { "id": "uuid-play", "videoUrl": "...", "thumbnailUrl": null, "updatedAt": "..." } }
```

**Comportamento:**
- Sobrescreve `videoUrl` atual (e opcionalmente `thumbnailUrl`) sem ownership check — admin pode anexar a qualquer play de qualquer atleta.
- Se `thumbnailUrl` ausente, backend dispara `generateThumbnailAsync` em background (setTimeout 0).

**Erros:**
- `404 { "message": "Lance não encontrado." }` se o `id` do play não existe.
- `400` — videoUrl não é URL válida.

---

## 🧭 Fluxo B — A partir da busca global de partidas

URL frontend de exemplo: `https://www.futscore.club/admin/partidas?q=ronaldo&position=FORWARD`

### Passo 1 — Buscar partidas globalmente

```
GET /api/admin/matches?q=ronaldo&primaryPosition=FORWARD&status=FINISHED
```

**Query params:**

| Param | Tipo | Notas |
|---|---|---|
| `page` / `pageSize` | int | default 1 / 20 |
| `q` | string | busca por nome/email do atleta e nickname (ILIKE) |
| `athleteId` | uuid | filtra partidas de 1 atleta específico |
| `primaryPosition` | enum | `GOALKEEPER \| DEFENDER \| MIDFIELDER \| FORWARD` |
| `minAge` / `maxAge` | int 0–120 | filtra via `birthDate` |
| `competitionId` | uuid | — |
| `status` | enum | `SCHEDULED \| LIVE \| FINISHED \| CANCELLED` |
| `result` | enum | `WIN \| LOSS \| DRAW \| NOT_FINISHED` |
| `from` / `to` | ISO date | — |

**Resposta (200):**

```json
{
  "items": [
    {
      "id": "uuid-match",
      "date": "2025-05-01T20:30:00.000Z",
      "adversaryTeam": "Palmeiras",
      "myTeamScore": 2,
      "adversaryScore": 1,
      "status": "FINISHED",
      "result": "WIN",
      "playsCount": 7,
      "competition": { "id": "uuid", "name": "Campeonato X" },
      "athleteProfile": {
        "id": "uuid-athlete",
        "name": "Ronaldo Assis",
        "nickname": "Ronaldinho",
        "profilePhoto": "https://...",
        "primaryPosition": "FORWARD"
      }
    }
  ],
  "page": 1, "pageSize": 20, "total": 128, "hasMore": true
}
```

**Erros:**
- `400 { "message": "minAge não pode ser maior que maxAge." }`

### Passo 2 — Abrir detalhe da partida

```
GET /api/admin/matches/:id
```

**Resposta (200):** match completo + `athleteProfile` + `myTeam` + `competition` + `playsCount`.

### Passo 3 — Ver lances daquela partida

```
GET /api/admin/matches/:id/plays
```

**Resposta (200):** `{ "items": [ ... ] }` — array de lances ordenados por `createdAt asc`, com `classifications` inclusas.

### Passo 4 e seguintes — Criar lance + anexar vídeo

Mesma coisa do Fluxo A (passos 3 e 4): `POST /api/admin/matches/:matchId/plays` e o trio de upload R2 + `PUT /api/admin/plays/:id/video-url`.

---

## 🛠️ Correções admin (extras)

### Corrigir placar/resultado

```
PATCH /api/admin/matches/:id/result
Content-Type: application/json

{
  "myTeamScore": 3,
  "adversaryScore": 1,
  "status": "FINISHED"
}
```

- Se `result` não vier, backend deriva `WIN/LOSS/DRAW` dos scores.
- Aceita `result` explícito pra casos especiais (`NOT_FINISHED`, etc.).

### Reatribuir partida a outro atleta

```
POST /api/admin/matches/:id/link-athlete
Content-Type: application/json

{ "athleteProfileId": "uuid-novo-atleta" }
```

- `404` se a partida ou o novo atleta não existem.

---

## 🎨 Tabs restantes do atleta (read-only)

### Conquistas

```
GET /api/admin/athletes/:athleteId/achievements?type=COLLECTIVE&year=2024
```

Query: `page`, `pageSize`, `type` (`COLLECTIVE | INDIVIDUAL`), `year` (int ≥ 1900).
Resposta: `{ items, page, pageSize, total, hasMore }`, cada item com `{ id, name, category, year, type, createdAt }`.

### Times (histórico)

```
GET /api/admin/athletes/:athleteId/team-history
```

**Sem paginação.** Resposta:

```json
{
  "items": [
    { "id": "...", "startDate": "...", "endDate": null, "team": { "id": "...", "name": "Palmeiras", "acronym": "SEP", "shieldPhoto": "..." } },
    { "id": "...", "startDate": "...", "endDate": "...", "team": { ... } }
  ],
  "currentTeam": { /* item com endDate = null, ou null se não houver */ }
}
```

---

## 💡 Dicas de UX pro painel

- **Tab Lances com filtro "Sem vídeo":** `GET /admin/athletes/:id/plays?hasVideo=false` — esse é o principal use case do fluxo de anexar vídeo; cada linha vira um botão "Anexar vídeo" que abre o upload picker.
- **Busca global + abrir partida:** `GET /admin/matches?q=...` retorna `athleteProfile` embutido, então a tabela de resultados já mostra foto/nome/posição sem precisar de N+1.
- **Thumbnail pode levar alguns segundos** após o upload. Mostre o `videoUrl` imediatamente (ou um placeholder) e faça refetch do play depois de ~5s pra pegar o `thumbnailUrl`.
- **Rate-limit do presigned URL:** o `expiresIn` default é 1h. Se o usuário demorar mais que isso entre pedir a URL e subir o arquivo, peça outra.
- **Erros 404 em PT-BR:** todos os endpoints admin retornam mensagens em português (`"Atleta não encontrado."`, `"Partida não encontrada."`, `"Lance não encontrado."`) — ideal pra exibir direto no toast do frontend.

---

## ✅ Checklist de integração

- [ ] Tab "Partidas" consome `GET /admin/athletes/:id/matches` com paginação + filtros
- [ ] Tab "Lances" consome `GET /admin/athletes/:id/plays` — toggle "só sem vídeo" (`hasVideo=false`)
- [ ] Tab "Conquistas" consome `GET /admin/athletes/:id/achievements`
- [ ] Tab "Times" consome `GET /admin/athletes/:id/team-history`
- [ ] Modal "Adicionar lance" (em partida qualquer) → `POST /admin/matches/:matchId/plays`
- [ ] Fluxo de vídeo: pick → `GET /admin/videos/upload-url` → PUT R2 → `PUT /admin/plays/:id/video-url`
- [ ] Busca global em `/admin/partidas` → `GET /admin/matches?q=...`
- [ ] Atalho "Corrigir placar" na tela de partida → `PATCH /admin/matches/:id/result`
- [ ] Atalho "Reatribuir atleta" → `POST /admin/matches/:id/link-athlete`
