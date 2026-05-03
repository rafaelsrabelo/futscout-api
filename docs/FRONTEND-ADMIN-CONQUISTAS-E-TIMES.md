# 🏆 Admin — Conquistas e Histórico de Times (Frontend)

Guia dos endpoints admin para gerenciar **conquistas** (`Achievement`) e **histórico de times** (`TeamHistory`) de um atleta. Cobre os 6 endpoints de escrita novos (CRUD para cada).

Para autenticação, veja `docs/FRONTEND-AUTH-ADMIN.md`.

> **Importante:** ações de admin **não consomem cota do plano** do atleta editado. Não há incremento de `Usage` em nenhum dos 6 endpoints.

---

## 📍 Mapa de endpoints

### Conquistas

| Uso | Método | Path |
|---|---|---|
| Listar conquistas do atleta | `GET` | `/api/admin/athletes/:athleteId/achievements` (já existia) |
| Criar conquista | `POST` | `/api/admin/athletes/:athleteId/achievements` |
| Editar conquista | `PATCH` | `/api/admin/achievements/:id` |
| Excluir conquista | `DELETE` | `/api/admin/achievements/:id` |

### Histórico de times

| Uso | Método | Path |
|---|---|---|
| Listar times do atleta | `GET` | `/api/admin/athletes/:athleteId/team-history` (já existia) |
| Criar entrada | `POST` | `/api/admin/athletes/:athleteId/team-history` |
| Editar entrada | `PATCH` | `/api/admin/team-history/:id` |
| Excluir entrada | `DELETE` | `/api/admin/team-history/:id` |

Todos exigem `Authorization: Bearer <accessToken>` com `role = 'ADMIN'`.

---

## 🏆 Conquistas

### `POST /api/admin/athletes/:athleteId/achievements`

**Path param:** `athleteId` (UUID) — `AthleteProfile.id`.

**Body:**

| Campo | Tipo | Observações |
|---|---|---|
| `name` | string (1–120) | Ex.: `"Campeonato Estadual"`, `"Melhor Jogador"` |
| `category` | string (1–60) | Ex.: `"U17"`, `"Profissional"` |
| `year` | int 1900–(ano atual + 1) | Ano da conquista |
| `type` | enum | `COLLECTIVE` (com o time) \| `INDIVIDUAL` (prêmio pessoal) |

**Resposta `201 Created`** — objeto `Achievement` completo:

```json
{
  "id": "uuid",
  "athleteId": "athlete-uuid",
  "name": "Campeonato Estadual",
  "category": "U17",
  "year": 2024,
  "type": "COLLECTIVE",
  "createdAt": "2026-05-03T13:00:00.000Z",
  "updatedAt": "2026-05-03T13:00:00.000Z"
}
```

**Erros:**
- `400` — Zod (body inválido).
- `404` — `Atleta não encontrado.`

---

### `PATCH /api/admin/achievements/:id`

**Path param:** `id` (UUID) — `Achievement.id`.

**Body — todos opcionais (partial update):**

| Campo | Tipo |
|---|---|
| `name` | string (1–120) |
| `category` | string (1–60) |
| `year` | int 1900–(ano atual + 1) |
| `type` | `COLLECTIVE` \| `INDIVIDUAL` |

**Resposta `200 OK`** — objeto `Achievement` atualizado.

**Erros:**
- `400` — Zod.
- `404` — `Conquista não encontrada.`

---

### `DELETE /api/admin/achievements/:id`

**Path param:** `id` (UUID).

**Resposta:**
- `204 No Content` — removida.
- `404` — `Conquista não encontrada.`

---

### Exemplo (frontend)

```ts
// Criar conquista
await api.post(`/admin/athletes/${athleteId}/achievements`, {
  name: 'Campeonato Estadual',
  category: 'U17',
  year: 2024,
  type: 'COLLECTIVE',
})

// Editar
await api.patch(`/admin/achievements/${achievementId}`, {
  type: 'INDIVIDUAL',
  name: 'Melhor Jogador',
})

// Excluir
await api.delete(`/admin/achievements/${achievementId}`)
```

---

## ⚽ Histórico de times

### `POST /api/admin/athletes/:athleteId/team-history`

**Path param:** `athleteId` (UUID) — `AthleteProfile.id`.

**Body:**

| Campo | Tipo | Observações |
|---|---|---|
| `teamId` | UUID | `Team.id` (deve existir) |
| `startDate` | string ISO datetime | Data de entrada no time |
| `endDate` | string ISO datetime \| null | `null` ou ausente = clube atual |

**Validação:** se `endDate` for fornecida, deve ser **estritamente posterior** a `startDate`.

**Resposta `201 Created`:**

```json
{
  "id": "uuid",
  "athleteId": "athlete-uuid",
  "teamId": "team-uuid",
  "startDate": "2024-01-15T00:00:00.000Z",
  "endDate": null,
  "createdAt": "2026-05-03T13:00:00.000Z",
  "updatedAt": "2026-05-03T13:00:00.000Z"
}
```

> O response **não** vem com o objeto `team` aninhado — pegue na lista (`GET /admin/athletes/:athleteId/team-history`) ou cacheie no frontend.

**Erros:**
- `400` — Zod ou `Data de término deve ser posterior à data de início.`
- `404` — `Atleta não encontrado.` ou `Time não encontrado.`

---

### `PATCH /api/admin/team-history/:id`

**Path param:** `id` (UUID) — `TeamHistory.id`.

**Body — todos opcionais:**

| Campo | Tipo |
|---|---|
| `teamId` | UUID — troca o time da entrada |
| `startDate` | string ISO datetime |
| `endDate` | string ISO datetime \| null — `null` reabre como "atual" |

A validação `startDate < endDate` considera o estado **resultante** (combina valores atuais + alterados).

**Resposta `200 OK`** — `TeamHistory` atualizado.

**Erros:**
- `400` — Zod ou período inválido.
- `404` — `Histórico de time não encontrado.` ou `Time não encontrado.`

---

### `DELETE /api/admin/team-history/:id`

**Path param:** `id` (UUID).

**Resposta:**
- `204 No Content`.
- `404` — `Histórico de time não encontrado.`

---

### Exemplo (frontend)

```ts
// Criar
await api.post(`/admin/athletes/${athleteId}/team-history`, {
  teamId: 'team-uuid',
  startDate: '2024-01-15T00:00:00.000Z',
  endDate: null, // clube atual
})

// Encerrar passagem (preencher endDate)
await api.patch(`/admin/team-history/${entryId}`, {
  endDate: '2024-12-31T00:00:00.000Z',
})

// Trocar para outro time
await api.patch(`/admin/team-history/${entryId}`, {
  teamId: 'outro-team-uuid',
})

// Excluir
await api.delete(`/admin/team-history/${entryId}`)
```

---

## 🔁 Fluxo recomendado nas tabs do atleta

1. Carregar a tab com `GET /admin/athletes/:athleteId/{achievements|team-history}`.
2. Botão "Adicionar" → modal → `POST` correspondente → re-fetch da lista.
3. Linha clicável → modal de edição → `PATCH /admin/{achievements|team-history}/:id` → re-fetch.
4. Lixeira → modal de confirmação → `DELETE` → re-fetch.

Mensagens de erro vêm em PT-BR (`"Conquista não encontrada."`, `"Time não encontrado."`, etc.) — exibíveis direto no toast.

---

## ✅ Checklist de integração

- [ ] Tab "Conquistas" com botões Adicionar/Editar/Excluir
- [ ] Form de conquista validando `year` ≤ ano atual + 1 e `type` (COLLECTIVE/INDIVIDUAL)
- [ ] Tab "Times" com botões Adicionar/Editar/Excluir
- [ ] Form de team-history com seletor de `Team` (precisa de UUID válido — provavelmente da lista de times do atleta ou um picker global)
- [ ] Validação no front de `endDate > startDate` antes de mandar para o backend (UX)
- [ ] Toggle "Time atual" no UI que envia `endDate: null`
