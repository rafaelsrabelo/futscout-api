# 📲 Admin — Envio de Notificações (Frontend)

Guia de integração da feature de **envio de push notifications** para o time de frontend admin. Cobre os 4 endpoints (preview, enviar, listar histórico, detalhar) e a UX sugerida pra tela de composição + histórico.

Para autenticação admin, veja `docs/FRONTEND-AUTH-ADMIN.md`. O contrato server-side completo está em `docs/push-notifications-backend.md`.

---

## 🎯 O que é

Admin compõe e dispara uma notificação push (título + corpo + opcionalmente um `data` para deep link) para um público escolhido. Três formas de definir o público:

| Audiência | Quando usar |
|---|---|
| **Todos** | Broadcast geral (todos os usuários com app instalado) |
| **Usuários específicos** | Lista escolhida a dedo na listagem de usuários/atletas |
| **Filtro de atletas** | Posição, classificação, idade, etc. (mesmos filtros da lista de atletas) |

Antes de enviar, o admin pode pedir um **preview** que mostra quantos usuários atendem ao filtro e quantos deles têm o app instalado. Toda notificação enviada vira uma linha no histórico.

> ⚠️ Notificações **não são canceláveis** — uma vez enviadas, foram entregues aos dispositivos. O preview existe pra evitar broadcasts indevidos.

---

## 🌐 Endpoints

| Método | Rota | O que faz |
|---|---|---|
| `POST` | `/api/admin/notifications/preview` | Conta destinatários antes de enviar |
| `POST` | `/api/admin/notifications/send` | Dispara a notificação |
| `GET` | `/api/admin/notifications` | Lista paginada do histórico |
| `GET` | `/api/admin/notifications/:id` | Detalhe de um envio |

**Auth (todos):** `Authorization: Bearer <accessToken>` com `role = 'ADMIN'` no JWT.

| Status comum | Quando |
|---|---|
| `200` | OK |
| `400` | Validação (Zod) — corpo, query ou param malformado |
| `401` | Token ausente, expirado ou na blacklist |
| `403` | Token válido mas usuário não é admin |
| `404` | `:id` não corresponde a nenhuma notificação |

---

## 🎯 Modelo de audiência (compartilhado entre preview e send)

`audience` é uma união discriminada pelo campo `type`:

```ts
type Audience =
  | { type: 'ALL' }
  | { type: 'USER_IDS'; userIds: string[] }
  | { type: 'ATHLETE_FILTER'; filters: AthleteAudienceFilters }
```

### `ATHLETE_FILTER` — filtros aceitos

Reaproveita exatamente os filtros de `GET /admin/athletes`. Só inclui usuários com `role = 'ATHLETE'`.

| Campo | Tipo | Notas |
|---|---|---|
| `gender` | `'MALE' \| 'FEMALE' \| 'OTHER'` | |
| `primaryPosition` | `'GOALKEEPER' \| 'DEFENDER' \| 'MIDFIELDER' \| 'FORWARD'` | |
| `dominantFoot` | `'RIGHT' \| 'LEFT'` | |
| `classification` | `'DESENVOLVIMENTO' \| 'PERFORMANCE' \| 'UNCLASSIFIED'` | `UNCLASSIFIED` = atletas com perfil mas sem classificação |
| `currentClub` | `string` | match `contains` case-insensitive |
| `minAge` / `maxAge` | `int` | inclusivo |
| `minHeight` / `maxHeight` | `number` | em metros (ex: 1.78) |
| `minWeight` / `maxWeight` | `number` | em kg |

Filtro vazio (`{ "type": "ATHLETE_FILTER", "filters": {} }`) → "todos os atletas".

---

## 1. `POST /api/admin/notifications/preview` — contar destinatários

### Body

```json
{
  "audience": {
    "type": "ATHLETE_FILTER",
    "filters": {
      "classification": "DESENVOLVIMENTO",
      "primaryPosition": "MIDFIELDER",
      "minAge": 16,
      "maxAge": 18
    }
  }
}
```

### Response 200

```json
{
  "totalRecipients": 423,
  "totalWithPushToken": 287
}
```

| Campo | Significado |
|---|---|
| `totalRecipients` | Usuários únicos que casam com o filtro |
| `totalWithPushToken` | Destes, quantos têm ≥1 device com app instalado — **é o número real que receberá** |

> A diferença entre os dois (`423 - 287 = 136`) é a sua oportunidade de comunicação: usuários que existem no sistema mas ainda não rodaram o app. Considere mostrar essa diferença na UI ("136 usuários sem o app").

---

## 2. `POST /api/admin/notifications/send` — disparar

### Body

```json
{
  "title": "Novo torneio disponível!",
  "body": "Inscreva-se até sexta-feira",
  "data": {
    "type": "tournament",
    "screen": "/(private)/(tabs)/profile",
    "params": { "id": "abc" }
  },
  "audience": { "type": "ALL" },
  "sound": "default",
  "badge": 1
}
```

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `title` | string 1..120 | ✅ | Aparece em bold no banner |
| `body` | string 1..240 | ✅ | Linha secundária do banner |
| `data` | objeto JSON | opcional | Payload de deep link — ver §Convenção do `data` |
| `audience` | union | ✅ | Ver §Modelo de audiência |
| `sound` | `'default' \| null` | opcional | Default: `'default'`. `null` = silencioso |
| `badge` | int ≥ 0 | opcional | Apenas iOS — Android ignora |

### Response 200

```json
{
  "log": { "id": "uuid", "createdAt": "2026-05-11T18:00:00.000Z" },
  "totalRecipients": 4,
  "totalWithToken": 2,
  "successCount": 2,
  "failureCount": 0,
  "invalidTokensRemoved": 0
}
```

| Campo | Significado |
|---|---|
| `log.id` | UUID do registro no histórico — guarde se quiser linkar pra `GET /admin/notifications/:id` |
| `totalRecipients` | Usuários que casaram com a audiência |
| `totalWithToken` | Quantos desses tinham token registrado |
| `successCount` | Mensagens **aceitas** pelo Expo (não é entrega confirmada — Expo Push usa fila assíncrona) |
| `failureCount` | Mensagens com erro de envio (rede, token mal-formado etc.) |
| `invalidTokensRemoved` | Tokens removidos automaticamente por `DeviceNotRegistered` |

> **Importante sobre `successCount`**: significa que a Expo aceitou enviar para APNs/FCM, não que o usuário recebeu. A confirmação de entrega (receipts) é fase 2 do backend.

### Erros

| Status | Body | Quando |
|---|---|---|
| `400` | `{ "message": "Validation error", ... }` | `title` ou `body` fora do tamanho / audience malformada |

---

## 3. `GET /api/admin/notifications` — histórico

### Query params

| Param | Tipo | Default |
|---|---|---|
| `page` | int ≥ 1 | `1` |
| `pageSize` | int 1..100 | `20` |

### Response 200

```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Novo torneio disponível!",
      "body": "Inscreva-se até sexta-feira",
      "data": { "type": "tournament", "screen": "..." },
      "audienceType": "ATHLETE_FILTER",
      "audiencePayload": {
        "type": "ATHLETE_FILTER",
        "filters": { "classification": "DESENVOLVIMENTO" }
      },
      "sentByUserId": "uuid-do-admin",
      "totalRecipients": 423,
      "totalWithToken": 287,
      "successCount": 280,
      "failureCount": 7,
      "invalidTokensCnt": 5,
      "createdAt": "2026-05-11T18:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 42,
  "hasMore": true
}
```

Ordenado do mais recente para o mais antigo.

---

## 4. `GET /api/admin/notifications/:id` — detalhe

### Response 200

```json
{ "notification": { /* mesmo formato de um item da listagem */ } }
```

### Erros

| Status | Body | Quando |
|---|---|---|
| `404` | `{ "message": "Notification not found" }` | `:id` não existe |

---

## 🧭 Fluxos de UX sugeridos

### Tela: Composição (`/admin/notificacoes/nova`)

```
┌─────────────────────────────────────────────────────────────────┐
│  Nova notificação                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Título *                                                        │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Novo torneio disponível!                                 │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                              24 / 120            │
│                                                                  │
│  Mensagem *                                                      │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Inscreva-se até sexta-feira no torneio sub-17 de SP.     │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                              52 / 240            │
│                                                                  │
│  ─────────────  Audiência  ──────────────                        │
│                                                                  │
│  ( ) Todos os usuários                                           │
│  (●) Por filtro de atletas                                       │
│  ( ) Usuários específicos                                        │
│                                                                  │
│   ┌─ Filtros ──────────────────────────────────────────────┐    │
│   │  Posição    [ Meio-campo ▾ ]                            │    │
│   │  Pé         [ Qualquer ▾ ]                              │    │
│   │  Classific. [ Desenvolvimento ▾ ]                       │    │
│   │  Idade      [ 16 ]  até  [ 18 ]                         │    │
│   │  Clube      [ ___________________________________ ]     │    │
│   │  ▸ Mais filtros (gênero, altura, peso)                  │    │
│   └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ─────────────  Avançado (opcional)  ─────────────               │
│                                                                  │
│  Tela ao tocar  [ Perfil do atleta ▾ ]                          │
│  Som            [ Padrão ▾ ]                                     │
│                                                                  │
│         [ Cancelar ]   [ 👁 Pré-visualizar destinatários ]      │
└─────────────────────────────────────────────────────────────────┘
```

### Modal: confirmar envio (depois do preview)

```
┌─────────────────────────────────────────────────────────┐
│  Confirmar envio                                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📊 287 usuários receberão                              │
│  (423 atendem ao filtro · 136 ainda não instalaram)     │
│                                                          │
│  ┌────────────────────────────────────────────────┐     │
│  │  📲 Novo torneio disponível!                   │     │
│  │  Inscreva-se até sexta-feira no torneio        │     │
│  │  sub-17 de SP.                                 │     │
│  └────────────────────────────────────────────────┘     │
│                                                          │
│  Filtro: Meio-campo · Desenvolvimento · 16–18 anos      │
│                                                          │
│  ⚠️  Esta ação não pode ser desfeita.                   │
│                                                          │
│             [ Voltar ]   [ Enviar agora ]                │
└─────────────────────────────────────────────────────────┘
```

### Fluxo

1. Admin preenche título + corpo + escolhe audiência.
2. Clica **"Pré-visualizar destinatários"** → chama `POST /preview`.
3. Modal abre com `totalRecipients` / `totalWithPushToken` + preview visual do banner + resumo do filtro.
4. Admin clica **"Enviar agora"** → chama `POST /send` com **o mesmo `audience`** que foi previewado.
5. Toast "Notificação enviada para 287 usuários" e redirect pra tela de histórico (`/admin/notificacoes`) com o novo item destacado.

> **Não cachear preview por mais que poucos segundos** — usuários podem instalar o app entre o preview e o envio. Se passou > 30s, refazer preview antes de enviar.

### Tela: Histórico (`/admin/notificacoes`)

Tabela com colunas:

| Quando | Título | Audiência | Recebem | Sucesso | Falhas |
|---|---|---|---|---|---|
| há 2 horas | Novo torneio… | Atletas (Meio-campo, Dev) | 287 | 280 | 7 |
| ontem 14:30 | Promoção Premium | Todos | 1.234 | 1.230 | 4 |

Clicar numa linha → drawer/modal com **detalhe completo** (corpo, payload `data`, filtros completos do `audiencePayload`).

### Selecionar usuários específicos (`USER_IDS`)

- A partir da própria tela de **listagem de atletas/usuários** (`/admin/athletes`, `/admin/users`).
- Adicionar checkbox por linha + barra fixa no topo com `N selecionados` e ação **"Enviar notificação"**.
- Ao clicar, abre o modal de composição com a audiência pré-preenchida como `{ type: 'USER_IDS', userIds: [...] }`.

---

## 🔗 Convenção do `data` (deep link)

Para o app abrir a tela certa ao tocar na notificação, padronize:

```json
{
  "type": "<categoria>",
  "screen": "/(private)/(tabs)/profile",
  "params": { "id": "..." }
}
```

| `type` | Tela alvo (sugerida) |
|---|---|
| `tournament` | rota de torneios |
| `favorite` | perfil do atleta |
| `scout` | perfil do atleta |
| `subscription` | aba de plano |
| `admin_broadcast` | home |

O mobile lê `data.screen` + `data.params` e chama `router.push()`. Veja `docs/MOBILE-PUSH-NOTIFICATIONS.md` para detalhes.

> Sugerir um **select de "Tela ao tocar"** no formulário em vez de input livre — evita o admin digitar uma rota inválida. Mapa de opções fica versionado no front, junto com as rotas do app.

---

## 🛠️ Snippets

### Tipos compartilhados

```ts
export type AudiencePayload =
  | { type: 'ALL' }
  | { type: 'USER_IDS'; userIds: string[] }
  | {
      type: 'ATHLETE_FILTER'
      filters: {
        gender?: 'MALE' | 'FEMALE' | 'OTHER'
        primaryPosition?:
          | 'GOALKEEPER'
          | 'DEFENDER'
          | 'MIDFIELDER'
          | 'FORWARD'
        dominantFoot?: 'RIGHT' | 'LEFT'
        classification?: 'DESENVOLVIMENTO' | 'PERFORMANCE' | 'UNCLASSIFIED'
        currentClub?: string
        minAge?: number
        maxAge?: number
        minHeight?: number
        maxHeight?: number
        minWeight?: number
        maxWeight?: number
      }
    }

export interface SendNotificationRequest {
  title: string
  body: string
  data?: Record<string, unknown>
  audience: AudiencePayload
  sound?: 'default' | null
  badge?: number
}

export interface PreviewResponse {
  totalRecipients: number
  totalWithPushToken: number
}

export interface SendResponse {
  log: { id: string; createdAt: string }
  totalRecipients: number
  totalWithToken: number
  successCount: number
  failureCount: number
  invalidTokensRemoved: number
}

export interface NotificationLogItem {
  id: string
  title: string
  body: string
  data: Record<string, unknown> | null
  audienceType: 'ALL' | 'USER_IDS' | 'ATHLETE_FILTER'
  audiencePayload: AudiencePayload
  sentByUserId: string
  totalRecipients: number
  totalWithToken: number
  successCount: number
  failureCount: number
  invalidTokensCnt: number
  createdAt: string
}
```

### Service (axios)

```ts
import type { AxiosInstance } from 'axios'

export const adminNotificationsApi = (api: AxiosInstance) => ({
  preview: (body: { audience: AudiencePayload }) =>
    api
      .post<PreviewResponse>('/admin/notifications/preview', body)
      .then((r) => r.data),

  send: (body: SendNotificationRequest) =>
    api.post<SendResponse>('/admin/notifications/send', body).then((r) => r.data),

  list: (params: { page?: number; pageSize?: number } = {}) =>
    api
      .get<{
        items: NotificationLogItem[]
        page: number
        pageSize: number
        total: number
        hasMore: boolean
      }>('/admin/notifications', { params })
      .then((r) => r.data),

  get: (id: string) =>
    api
      .get<{ notification: NotificationLogItem }>(`/admin/notifications/${id}`)
      .then((r) => r.data),
})
```

### React Query (TanStack)

```ts
const usePreviewAudience = () =>
  useMutation({
    mutationFn: (audience: AudiencePayload) =>
      adminNotificationsApi(api).preview({ audience }),
  })

const useSendNotification = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: SendNotificationRequest) =>
      adminNotificationsApi(api).send(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-notifications'] })
    },
  })
}

const useNotificationHistory = (params: { page?: number; pageSize?: number }) =>
  useQuery({
    queryKey: ['admin-notifications', params],
    queryFn: () => adminNotificationsApi(api).list(params),
  })
```

### Validação Zod (cliente)

Para validar o form antes de chamar `send`:

```ts
import { z } from 'zod'

const audienceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ALL') }),
  z.object({
    type: z.literal('USER_IDS'),
    userIds: z.array(z.string().uuid()).min(1),
  }),
  z.object({
    type: z.literal('ATHLETE_FILTER'),
    filters: z.object({
      gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
      primaryPosition: z
        .enum(['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'])
        .optional(),
      dominantFoot: z.enum(['RIGHT', 'LEFT']).optional(),
      classification: z
        .enum(['DESENVOLVIMENTO', 'PERFORMANCE', 'UNCLASSIFIED'])
        .optional(),
      currentClub: z.string().trim().min(1).optional(),
      minAge: z.coerce.number().int().min(0).max(120).optional(),
      maxAge: z.coerce.number().int().min(0).max(120).optional(),
      minHeight: z.coerce.number().positive().optional(),
      maxHeight: z.coerce.number().positive().optional(),
      minWeight: z.coerce.number().positive().optional(),
      maxWeight: z.coerce.number().positive().optional(),
    }),
  }),
])

const sendSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(240),
  data: z.record(z.unknown()).optional(),
  audience: audienceSchema,
  sound: z.enum(['default']).nullable().optional(),
  badge: z.number().int().min(0).optional(),
})
```

### Helper: descrever audiência em PT-BR

Útil para exibir resumos no histórico e no modal de confirmação:

```ts
export function describeAudience(p: AudiencePayload): string {
  if (p.type === 'ALL') return 'Todos os usuários'
  if (p.type === 'USER_IDS') return `${p.userIds.length} usuários específicos`

  const f = p.filters
  const parts: string[] = []
  if (f.primaryPosition) {
    parts.push(POSITION_LABELS[f.primaryPosition]) // mapa que você já tem
  }
  if (f.classification) {
    parts.push(
      f.classification === 'UNCLASSIFIED'
        ? 'Não classificados'
        : CLASSIFICATION_LABELS[f.classification],
    )
  }
  if (f.minAge !== undefined || f.maxAge !== undefined) {
    parts.push(`${f.minAge ?? '?'}–${f.maxAge ?? '?'} anos`)
  }
  if (f.currentClub) parts.push(`Clube: ${f.currentClub}`)
  return parts.length > 0 ? `Atletas (${parts.join(' · ')})` : 'Todos os atletas'
}
```

---

## ✅ Checklist de integração

- [ ] Rota `/admin/notificacoes/nova` com form de composição (título, corpo, audiência, payload).
- [ ] Switch entre 3 modos de audiência (Todos / Filtro / Usuários específicos).
- [ ] Filtros de atleta espelhando os de `/admin/athletes` (mesma UX).
- [ ] Modal de **preview** antes do envio (chama `/preview`, mostra `totalRecipients` + `totalWithPushToken`).
- [ ] Modal de **confirmação** com preview visual do banner.
- [ ] Aviso "Esta ação não pode ser desfeita" no modal de confirmação.
- [ ] Refetch do preview se o admin ficar > 30s no modal antes de enviar.
- [ ] Rota `/admin/notificacoes` com tabela de histórico (paginação).
- [ ] Drawer/modal de detalhe ao clicar numa linha do histórico.
- [ ] Helper `describeAudience()` centralizado pra exibir audiência em PT-BR em vários lugares.
- [ ] Botão "Enviar notificação" na barra de seleção múltipla da lista de atletas/usuários (pré-preenche `USER_IDS`).
- [ ] Select de "Tela ao tocar" com opções pré-definidas (não input livre).

---

## 🚨 Pontos de atenção

- **Sem cancelamento.** Uma vez enviada, não dá pra desfazer. UI deve deixar isso claro.
- **`successCount` não é entrega confirmada.** É só o aceite pela fila do Expo. Não criar UX que prometa "entregue a X pessoas" — usar "enviado a X" ou "X devem receber".
- **Tokens inválidos são removidos automaticamente** pelo backend. Não precisa lidar com isso no admin.
- **Filtros de atleta excluem observers e admins** — para incluí-los use `ALL` ou `USER_IDS`.
- **`badge` só funciona no iOS.** Não prometa esse comportamento ao admin se o público for misto.

---

## 🔮 Pontos abertos / fase 2

- Agendar envio para uma data/hora futura.
- Templates salvos (ex.: "Lembrete de partida").
- Segmentação por **atividade** (não logou há X dias, plano FREE, etc.).
- Receipts individuais — saber quem recebeu, abriu, etc.
- Notificações automatizadas por evento (favoritou, comentou, partida criada).
