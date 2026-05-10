# 🏷️ Admin — Classificar Atleta (Frontend)

Guia de integração da feature de **classificação interna de atletas** para o time de frontend. Cobre o fluxo, os 3 pontos da API (filtro na listagem, set + histórico) e a UX sugerida.

Para autenticação admin, veja `docs/FRONTEND-AUTH-ADMIN.md`.

---

## 🎯 O que é

Admin classifica atletas internamente em um dos tipos abaixo. Toda classificação é **versionada**: cada decisão fica registrada em log com quem classificou, quando, e um comentário opcional. Reclassificar é normal — vira uma nova entrada no histórico, e o "valor atual" do atleta é sempre a última entrada.

| Valor | Significado |
|---|---|
| `DESENVOLVIMENTO` | Atleta em fase de desenvolvimento |
| `PERFORMANCE` | Atleta em nível de performance |
| `null` | Ainda não classificado (default de todo atleta novo) — também usado pra "des-classificar" alguém |

> Novos valores podem ser adicionados depois (ex.: `ELITE`, `BASE`). O frontend deve consumir o enum como valor cru e renderizar via mapa de labels para sobreviver a esses adds.

---

## 🌐 Endpoints

| Método | Rota | O que faz |
|---|---|---|
| `GET` | `/api/admin/athletes` | Listagem (já existente) — agora aceita filtro `?classification=...` e devolve o campo `classification` em cada item |
| `PATCH` | `/api/admin/athletes/:id/classification` | Classifica (ou des-classifica) um atleta. Cria entrada no histórico e atualiza o snapshot do perfil |
| `GET` | `/api/admin/athletes/:id/classification/history` | Lista paginada do histórico de classificações daquele atleta |

**Auth (todos):** `Authorization: Bearer <accessToken>` com `role = 'ADMIN'` no JWT.

| Status | Quando |
|---|---|
| `200` | OK (`PATCH` e `GET history`) |
| `400` | Validação (Zod) — corpo, query ou param malformado |
| `401` | Token ausente, expirado ou na blacklist |
| `403` | Token válido mas usuário não é admin |
| `404` | `:id` não corresponde a nenhum atleta (ou atleta sem perfil) |

> ⚠️ Ações admin **não consomem cota** de plano e **não geram notificação** ao atleta. A classificação é interna e não é exibida no app do atleta.

---

## 1. `GET /api/admin/athletes` — listagem com `classification`

### Query params (apenas os relacionados à classificação — os demais já estão documentados em `FRONTEND-ADMIN-ATHLETES.md`)

| Param | Tipo | Valores | Default |
|---|---|---|---|
| `classification` | enum | `DESENVOLVIMENTO` \| `PERFORMANCE` \| `UNCLASSIFIED` | — |

- `DESENVOLVIMENTO` / `PERFORMANCE` → só atletas com aquele valor atual.
- `UNCLASSIFIED` → só atletas com perfil **e** classification `null`.
- Sem o param → não filtra por classificação (todos).

> `UNCLASSIFIED` exige que o atleta tenha um `AthleteProfile` (mesmo que esqueleto). Usuários com `role=ATHLETE` que ainda não criaram perfil **não** entram em `UNCLASSIFIED`.

### Response 200 (recorte do item)

```json
{
  "items": [
    {
      "id": "uuid-do-perfil",
      "userId": "uuid-do-user",
      "hasProfile": true,
      "nickname": "rafa10",
      "primaryPosition": "FORWARD",
      "currentClub": "Flamengo",
      "classification": "DESENVOLVIMENTO",
      "user": { "id": "...", "name": "Rafael", "email": "..." }
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 137,
  "hasMore": true
}
```

`classification` é `'DESENVOLVIMENTO' | 'PERFORMANCE' | null`. Atletas sem perfil retornam `null`.

---

## 2. `PATCH /api/admin/athletes/:id/classification` — classificar/reclassificar

### Path param

| Param | Tipo | Descrição |
|---|---|---|
| `id` | UUID | `AthleteProfile.id` (o mesmo usado em `GET /admin/athletes/:id`) |

### Body

```ts
{
  classification: 'DESENVOLVIMENTO' | 'PERFORMANCE' | null,
  comment?: string  // opcional, máx 500 chars (trim aplicado)
}
```

| Campo | Tipo | Obrigatório | Observações |
|---|---|---|---|
| `classification` | enum \| `null` | ✅ | `null` registra uma "des-classificação" (volta a ficar não classificado, e fica no histórico) |
| `comment` | string | opcional | Justificativa livre, até 500 chars — trim aplicado pelo backend |

### Response 200

```json
{
  "athleteProfile": {
    "id": "uuid-do-perfil",
    "userId": "uuid-do-user",
    "classification": "PERFORMANCE",
    "updatedAt": "2026-05-10T17:42:11.123Z"
  },
  "log": {
    "id": "uuid-do-log",
    "classification": "PERFORMANCE",
    "comment": "Promovido após avaliação de maio",
    "classifiedById": "uuid-do-admin",
    "createdAt": "2026-05-10T17:42:11.118Z"
  }
}
```

### Notas

- A request **não é deduplicada por valor**: classificar 2x para `PERFORMANCE` cria 2 entradas no histórico (mesmo o snapshot continuando `PERFORMANCE`). Decisão consciente — queremos saber que o admin reavaliou, mesmo mantendo o valor.
- O `classifiedById` é extraído do JWT do admin que fez a request — o frontend **não envia** isso.
- Se quiser exibir o nome do admin que classificou, use o `GET history` (que já popula `classifiedBy`).

### Erros

| Status | Body | Quando |
|---|---|---|
| `400` | `{ "message": "Validation error", ... }` | Enum fora dos valores válidos / comment > 500 |
| `404` | `{ "message": "Atleta não encontrado." }` | `:id` não existe |

---

## 3. `GET /api/admin/athletes/:id/classification/history` — histórico

### Path + query

| Param | Tipo | Default |
|---|---|---|
| `id` (path) | UUID | — |
| `page` (query) | int ≥ 1 | `1` |
| `pageSize` (query) | int 1–100 | `20` |

### Response 200

```json
{
  "items": [
    {
      "id": "uuid-log-3",
      "athleteId": "uuid-do-perfil",
      "classification": "PERFORMANCE",
      "comment": "Promovido após avaliação de maio",
      "classifiedById": "uuid-do-admin",
      "createdAt": "2026-05-10T17:42:11.118Z",
      "classifiedBy": {
        "id": "uuid-do-admin",
        "name": "Admin João",
        "email": "joao@futscout.com"
      }
    },
    {
      "id": "uuid-log-2",
      "athleteId": "uuid-do-perfil",
      "classification": "DESENVOLVIMENTO",
      "comment": "Avaliação inicial",
      "classifiedById": "uuid-do-admin-1",
      "createdAt": "2026-04-02T10:11:00.000Z",
      "classifiedBy": { "id": "...", "name": "Admin Maria", "email": "..." }
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 2,
  "hasMore": false
}
```

- Ordenado **do mais recente para o mais antigo** (`createdAt DESC`).
- Atleta sem histórico → `items: []`, `total: 0` (e **não** é 404 — só é 404 se o `:id` não existir).

### Erros

| Status | Body | Quando |
|---|---|---|
| `404` | `{ "message": "Atleta não encontrado." }` | `:id` não existe |

---

## 🧭 Fluxos de UX sugeridos

### Tela: lista de atletas (admin)

1. Adicionar coluna **Classificação** com 3 estados visuais:
   - `DESENVOLVIMENTO` → badge amarelo "Desenvolvimento".
   - `PERFORMANCE` → badge verde "Performance".
   - `null` → badge cinza "Não classificada" (clicável pra abrir o modal).
2. Adicionar filtro/select no topo com 4 opções: `Todos` (default, sem param), `Desenvolvimento`, `Performance`, `Não classificados` (`UNCLASSIFIED`).
3. Botão de ação por linha **Classificar** abre o modal (item 4).

### Modal: classificar atleta

```
┌───────────────────────────────────────────┐
│  Classificar  ·  Rafael Rabelo            │
├───────────────────────────────────────────┤
│  Classificação atual:  ● Desenvolvimento  │
│                                           │
│  Nova classificação:                      │
│  ( ) Desenvolvimento                      │
│  (●) Performance                          │
│  ( ) Remover classificação                │
│                                           │
│  Comentário (opcional)                    │
│  ┌───────────────────────────────────┐    │
│  │ Promovido após avaliação de maio  │    │
│  └───────────────────────────────────┘    │
│                            0 / 500        │
│                                           │
│  [ Ver histórico ]   [ Cancelar ] [ Salvar ]
└───────────────────────────────────────────┘
```

- O 3º radio "Remover classificação" envia `classification: null` no PATCH.
- "Salvar" desabilitado se nenhuma opção marcada.
- Mostra a classificação atual em destaque (carrega do item da listagem ou do `GET /admin/athletes/:id`).
- Em "Ver histórico", abre o painel/drawer do item abaixo.

### Drawer: histórico de classificações

- Lista cronológica (mais recente em cima), cada item com:
  - Badge da classificação (ou "Removida" se `classification: null`).
  - Comentário (ou "—" se vazio).
  - Nome do admin (`classifiedBy.name`) e data/hora formatada.
- Paginação ao final (use `hasMore` pra esconder o "Carregar mais").

### Pós-classificar

Após `PATCH` 200:
1. Atualizar a linha da listagem com o novo `classification` (sem refetch geral).
2. Toast "Atleta classificado como Performance".
3. Se o drawer do histórico estiver aberto, prepend o novo `log` na lista.
4. Se houver filtro `?classification=` ativo e o novo valor não bate, **remover** a linha da página atual (ou refetch).

---

## 🛠️ Snippets

### Service (axios)

```ts
import type { AxiosInstance } from 'axios'

export type AthleteClassification = 'DESENVOLVIMENTO' | 'PERFORMANCE'
export type AthleteClassificationFilter =
  | AthleteClassification
  | 'UNCLASSIFIED'

export interface ClassificationLog {
  id: string
  athleteId: string
  classification: AthleteClassification | null
  comment: string | null
  classifiedById: string
  createdAt: string
  classifiedBy: { id: string; name: string; email: string }
}

export interface SetClassificationResponse {
  athleteProfile: {
    id: string
    userId: string
    classification: AthleteClassification | null
    updatedAt: string
  }
  log: Omit<ClassificationLog, 'classifiedBy' | 'athleteId'>
}

export interface ListHistoryResponse {
  items: ClassificationLog[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

export const adminAthleteClassificationApi = (api: AxiosInstance) => ({
  set: (
    athleteId: string,
    body: { classification: AthleteClassification | null; comment?: string },
  ) =>
    api
      .patch<SetClassificationResponse>(
        `/admin/athletes/${athleteId}/classification`,
        body,
      )
      .then((r) => r.data),

  history: (
    athleteId: string,
    params: { page?: number; pageSize?: number } = {},
  ) =>
    api
      .get<ListHistoryResponse>(
        `/admin/athletes/${athleteId}/classification/history`,
        { params },
      )
      .then((r) => r.data),
})
```

### React Query (TanStack)

```ts
const useSetClassification = (athleteId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      classification: AthleteClassification | null
      comment?: string
    }) => adminAthleteClassificationApi(api).set(athleteId, body),
    onSuccess: () => {
      // Refetch do histórico (pra trazer o novo log já com o classifiedBy populado).
      qc.invalidateQueries({
        queryKey: ['admin-athlete-classification-history', athleteId],
      })
      // Refletir o snapshot na listagem.
      qc.invalidateQueries({ queryKey: ['admin-athletes'] })
    },
  })
}

const useClassificationHistory = (athleteId: string) =>
  useQuery({
    queryKey: ['admin-athlete-classification-history', athleteId],
    queryFn: () => adminAthleteClassificationApi(api).history(athleteId),
    enabled: !!athleteId,
  })
```

### Mapa de labels

```ts
export const CLASSIFICATION_LABELS: Record<AthleteClassification, string> = {
  DESENVOLVIMENTO: 'Desenvolvimento',
  PERFORMANCE: 'Performance',
}

export const CLASSIFICATION_COLORS: Record<AthleteClassification, string> = {
  DESENVOLVIMENTO: 'amber',
  PERFORMANCE: 'emerald',
}

export const renderClassification = (
  value: AthleteClassification | null,
): { label: string; color: string } =>
  value
    ? { label: CLASSIFICATION_LABELS[value], color: CLASSIFICATION_COLORS[value] }
    : { label: 'Não classificada', color: 'slate' }
```

---

## ✅ Checklist de integração

- [ ] Coluna **Classificação** na lista de atletas (com badge colorido).
- [ ] Filtro `?classification=` no topo da listagem (`Todos | Desenvolvimento | Performance | Não classificados`).
- [ ] Botão **Classificar** por linha abrindo o modal.
- [ ] Modal com 3 opções (Desenvolvimento / Performance / Remover) + campo de comentário (max 500).
- [ ] Drawer/panel de **Histórico** acessível a partir do modal e/ou do detalhe do atleta.
- [ ] Atualização otimista (ou invalidação) da listagem após classificar.
- [ ] Mapa de labels/cores centralizado pra suportar novos valores no futuro sem reescrever telas.
- [ ] Não exibir essa informação em telas que o atleta possa visualizar (é admin-only).
