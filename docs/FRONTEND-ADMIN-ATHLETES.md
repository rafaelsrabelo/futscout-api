# 👥 Admin — Listagem de Atletas (Frontend)

Guia de integração do endpoint `GET /api/admin/athletes` para o time de frontend. Cobre contrato da API, UX sugerida e exemplos de consumo.

Para autenticação, veja `docs/FRONTEND-AUTH-ADMIN.md`.

---

## 🌐 Endpoint

```
GET /api/admin/athletes
```

**Auth:** `Authorization: Bearer <accessToken>` com `role = 'ADMIN'` no JWT.

- `401` — token ausente, expirado ou na blacklist.
- `403` — token válido, mas usuário não é admin.
- `400` — erro de validação (pageSize acima de 100, `minAge > maxAge`, enum inválido, etc.).

---

## 🧾 Query Params

Todos opcionais a menos de `page` e `pageSize` (com defaults). Validação server-side via Zod.

| Param | Tipo | Range / Valores | Default |
|-------|------|-----------------|---------|
| `page` | int | ≥ 1 | `1` |
| `pageSize` | int | 1 – 100 | `20` |
| `q` | string | livre (trim, mín. 1) | — |
| `gender` | enum | `MALE` \| `FEMALE` \| `OTHER` | — |
| `primaryPosition` | enum | `GOALKEEPER` \| `DEFENDER` \| `MIDFIELDER` \| `FORWARD` | — |
| `dominantFoot` | enum | `RIGHT` \| `LEFT` | — |
| `currentClub` | string | match parcial (ILIKE) | — |
| `hasManager` | boolean | `true` \| `false` | — |
| `minAge` | int | 0 – 120 | — |
| `maxAge` | int | 0 – 120 | — |
| `minHeight` | número | > 0 (metros, ex: `1.78`) | — |
| `maxHeight` | número | > 0 | — |
| `minWeight` | número | > 0 (kg, ex: `72.5`) | — |
| `maxWeight` | número | > 0 | — |

Notas:

- `q` faz busca case-insensitive em `athleteProfile.nickname`, `user.name` e `user.email`. Não pesquisa por CPF.
- Idade é derivada do `birthDate` **no servidor**. O frontend manda anos inteiros e não precisa converter para data.
- Se `minAge > maxAge`, a API retorna `400 { message: 'minAge não pode ser maior que maxAge.' }`.

---

## 📦 Resposta `200 OK`

```json
{
  "items": [
    {
      "id": "b4d9-...-e1",
      "nickname": "Rafa",
      "profilePhoto": "https://r2.futscout.com/...jpg",
      "birthDate": "2005-06-15T00:00:00.000Z",
      "age": 19,
      "gender": "MALE",
      "primaryPosition": "FORWARD",
      "secondaryPosition": null,
      "dominantFoot": "RIGHT",
      "currentClub": "Flamengo",
      "height": 1.78,
      "weight": 72,
      "hasManager": false,
      "cpf": "12345678901",
      "createdAt": "2025-01-10T12:00:00.000Z",
      "user": {
        "id": "uuid-user",
        "name": "Rafael Rabelo",
        "email": "rafa@example.com",
        "emailVerified": true,
        "isActive": true,
        "createdAt": "2025-01-10T12:00:00.000Z",
        "lastLoginAt": null
      }
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 187,
  "hasMore": true
}
```

### Campos por item

| Campo | Tipo | Observações |
|-------|------|-------------|
| `id` | string | UUID do `AthleteProfile` (não do `User`). Use este id em rotas como `GET /admin/athletes/:id`. |
| `nickname` | string \| null | — |
| `profilePhoto` | string \| null | URL pública em R2. |
| `birthDate` | ISO 8601 | — |
| `age` | int | Calculado server-side. |
| `gender` | `MALE` \| `FEMALE` \| `OTHER` | — |
| `primaryPosition` | enum | `GOALKEEPER` \| `DEFENDER` \| `MIDFIELDER` \| `FORWARD` |
| `secondaryPosition` | enum \| null | Mesmo domínio de `primaryPosition`. |
| `dominantFoot` | `RIGHT` \| `LEFT` | — |
| `currentClub` | string \| null | Nome livre. |
| `height` | float | Metros. |
| `weight` | float | Quilogramas. |
| `hasManager` | bool | — |
| `cpf` | string | **Sensível.** Só aparece em endpoints admin. |
| `createdAt` | ISO 8601 | Data de criação do `AthleteProfile`. |
| `user.id` | string | UUID do `User` dono do profile. |
| `user.name` | string | — |
| `user.email` | string | **Sensível.** |
| `user.emailVerified` | bool | — |
| `user.isActive` | bool | `false` ⇒ conta bloqueada/desativada. |
| `user.createdAt` | ISO 8601 | Data de criação da conta. |
| `user.lastLoginAt` | ISO 8601 \| null | **Sempre `null` enquanto BE-16 não rodar a migration.** Não confie neste campo ainda. |

### Campos de paginação

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `page` | int | Página atual (echo do input). |
| `pageSize` | int | Tamanho da página (echo do input). |
| `total` | int | Total de atletas que batem com os filtros (não só da página). |
| `hasMore` | bool | `true` se ainda existem registros após essa página. |

---

## 🖼️ UX sugerida

**Página "Atletas" do painel admin:**

1. **Barra de busca** no topo — campo `q`, com debounce de ~300ms. A cada digitação, reseta `page=1` e refaz a requisição.
2. **Barra de filtros** colapsável:
   - Selects: posição (4), perna dominante (2), gênero (3).
   - Toggle: tem empresário?
   - Input: clube atual (usa `currentClub`).
   - Ranges: idade (0–50), altura (1.40–2.20), peso (40–120).
3. **Tabela ou grid** populada com `items[]`:
   - Colunas típicas: foto, nome (`user.name`), nickname, posição, idade, clube, email, status (`isActive` + `emailVerified`).
   - Linha clicável → abre a tela de detalhe (futuro `GET /api/admin/athletes/:id`, em breve).
4. **Paginação**:
   - Use `total` para o contador "Exibindo X de Y".
   - Use `hasMore` para habilitar o botão "próxima página" (ou gate de infinite scroll).
   - `pageSize` default de 20 é razoável; expor seletor (10 / 20 / 50 / 100) é opcional.

**Permissões:**
- O token já foi validado em `GET /api/admin/auth/verify` no boot. Dentro da área admin, basta tratar `401`/`403` no interceptor global.

---

## 🧪 Exemplo — Fetch

```ts
export interface AdminAthleteListItem {
  id: string
  nickname: string | null
  profilePhoto: string | null
  birthDate: string
  age: number
  gender: 'MALE' | 'FEMALE' | 'OTHER'
  primaryPosition: 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD'
  secondaryPosition: 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD' | null
  dominantFoot: 'RIGHT' | 'LEFT'
  currentClub: string | null
  height: number
  weight: number
  hasManager: boolean
  cpf: string
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    emailVerified: boolean
    isActive: boolean
    createdAt: string
    lastLoginAt: string | null
  }
}

export interface ListAthletesAdminParams {
  page?: number
  pageSize?: number
  q?: string
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  primaryPosition?: AdminAthleteListItem['primaryPosition']
  dominantFoot?: 'RIGHT' | 'LEFT'
  currentClub?: string
  hasManager?: boolean
  minAge?: number
  maxAge?: number
  minHeight?: number
  maxHeight?: number
  minWeight?: number
  maxWeight?: number
}

export async function listAthletesAdmin(
  params: ListAthletesAdminParams,
  accessToken: string,
) {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '' && v !== null)
      .map(([k, v]) => [k, String(v)]),
  )

  const res = await fetch(`/api/admin/athletes?${qs}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (res.status === 401) throw new Error('Não autenticado.')
  if (res.status === 403) throw new Error('Acesso restrito a administradores.')
  if (res.status === 400) {
    const body = await res.json()
    throw new Error(body.message ?? 'Parâmetros inválidos.')
  }
  if (!res.ok) throw new Error('Falha ao listar atletas.')

  return res.json() as Promise<{
    items: AdminAthleteListItem[]
    page: number
    pageSize: number
    total: number
    hasMore: boolean
  }>
}
```

---

## 🧪 Exemplo — Axios (reaproveita interceptor de `FRONTEND-AUTH-ADMIN.md`)

```ts
const { data } = await api.get<{
  items: AdminAthleteListItem[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}>('/admin/athletes', {
  params: {
    q: 'rafa',
    primaryPosition: 'FORWARD',
    minAge: 15,
    maxAge: 20,
    page: 1,
    pageSize: 20,
  },
})
```

---

## ⚠️ O que ainda não existe

Campos e filtros que a task originalmente listava e que **não** foram implementados por não haver no schema atual:

- `category` (`U5..U20`, etc.) — não existe em `AthleteProfile`. Vive indiretamente em `Match`/`Team`.
- `city` / `state` — estão em `Address` (relação do `AthleteProfile`). Fora do escopo do v1.
- `phone` — `User` não tem esse campo.
- `lastLoginAt` — sempre `null` até a migration de BE-16.

Se a UI precisar desses campos urgentemente, abrir ticket e priorizar BE-16 + task específica para expor `Address.city/state`.

---

## 📬 Próximos endpoints admin

| Endpoint | Status |
|----------|--------|
| `GET /api/admin/auth/verify` | ✅ pronto |
| `GET /api/admin/athletes` | ✅ pronto (este doc) |
| `GET /api/admin/athletes/:id` | 🚧 em andamento (BE-08) |
| `GET /api/admin/athletes/:athleteId/matches` | backlog (BE-09) |
| `GET /api/admin/matches` | backlog (BE-10) |
| `GET /api/admin/matches/:id` | backlog (BE-11) |
| `GET /api/admin/matches/:id/plays` | backlog (BE-12) |
| `POST /api/admin/matches` | backlog (BE-13) |
| `PATCH /api/admin/matches/:id/result` | backlog (BE-14) |
| `POST /api/admin/matches/:id/link-athlete` | backlog (BE-15) |
| `GET /api/admin/dashboard/*` | backlog (BE-17 – BE-20, depende de BE-16) |
| `GET /api/admin/search` | backlog (BE-21) |

Referência técnica de cada task em `ai/tasks/backend.md`.
