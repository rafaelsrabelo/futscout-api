# 📲 Push Notifications — Backend (futscout-api)

Especificação dos endpoints e do modelo de dados de **push notifications**. O frontend mobile está documentado separadamente; aqui descrevemos o contrato pelo qual o app e o admin interagem com a API.

- **Serviço:** [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/) (proxy oficial Expo → APNs/FCM).
- **Lib server-side:** `expo-server-sdk`.
- **Autenticação:** todas as rotas exigem JWT (`Authorization: Bearer <accessToken>`). As rotas `/admin/notifications/*` exigem também `role = 'ADMIN'`.

---

## 🧱 Schema (Prisma)

Duas tabelas novas e dois enums foram adicionados em `prisma/schema.prisma`.

```prisma
enum PushPlatform {
  IOS
  ANDROID
}

enum NotificationAudienceType {
  ALL
  USER_IDS
  ATHLETE_FILTER
}

model PushToken {
  id         String       @id @default(uuid())
  userId     String
  user       User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  token      String       @unique               // ExponentPushToken[...]
  platform   PushPlatform
  deviceName String?
  deviceId   String?                            // expo-constants installationId
  appVersion String?
  lastUsedAt DateTime     @default(now())
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt

  @@index([userId])
  @@index([deviceId])
  @@map("push_tokens")
}

model NotificationLog {
  id               String                   @id @default(uuid())
  title            String
  body             String
  data             Json?
  audienceType     NotificationAudienceType
  audiencePayload  Json
  sentByUserId     String
  sentBy           User                     @relation(fields: [sentByUserId], references: [id], onDelete: Restrict)
  totalRecipients  Int                      @default(0)
  totalWithToken   Int                      @default(0)
  successCount     Int                      @default(0)
  failureCount     Int                      @default(0)
  invalidTokensCnt Int                      @default(0)
  createdAt        DateTime                 @default(now())

  @@index([createdAt])
  @@index([sentByUserId])
  @@map("notification_logs")
}
```

**Por que `onDelete: Cascade` em `PushToken.userId`:** quando o usuário é excluído, seus tokens vão junto — não faz sentido tentar entregar para um destinatário que não existe mais.

**Por que `onDelete: Restrict` em `NotificationLog.sentByUserId`:** o histórico de auditoria deve preservar quem disparou. Apagar o admin não deve apagar (nem deixar órfão) o log.

---

## 🔑 Variáveis de ambiente

```env
EXPO_ACCESS_TOKEN=   # opcional; recomendado em produção
```

Sem `EXPO_ACCESS_TOKEN` o envio funciona em modo anônimo (limites de throughput menores). Crie um token em `expo.dev > Account Settings > Access Tokens` quando ligar em produção.

---

## 📱 Rotas — App (usuário autenticado)

### `POST /api/push-tokens` — registrar/atualizar token

Chamada pelo app após login (e idealmente a cada start, pra renovar `lastUsedAt`).

**Request**
```json
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxx]",
  "platform": "IOS",
  "deviceName": "iPhone 15",
  "deviceId": "ABC-123",
  "appVersion": "1.18.0"
}
```

**Validações**
- `token` precisa casar com o formato `ExponentPushToken[...]` (validado por `Expo.isExpoPushToken`).
- `platform` é `"IOS" | "ANDROID"`.
- `deviceName`, `deviceId`, `appVersion` são opcionais.

**Comportamento**
1. Upsert por `token` (chave única). Se já existia atrelado a outro `userId`, é **reatribuído** ao usuário atual (caso de troca de conta no mesmo aparelho).
2. Se `deviceId` for informado, tokens anteriores do **mesmo `deviceId` + mesmo `userId`** são removidos antes do upsert. Evita 2 envios para o mesmo aparelho quando o Expo rotaciona o token.
3. `lastUsedAt` é atualizado para `now()`.

**Response `201`**
```json
{ "id": "uuid", "token": "ExponentPushToken[...]" }
```

**Erros**
- `400` — token mal formado (`InvalidPushTokenError`).
- `401` — JWT ausente/expirado.

### `DELETE /api/push-tokens/:token` — remover token

Chamada pelo app no **logout**. Idempotente.

**Comportamento**
- Se o token existir **e** pertencer ao `userId` do JWT, é removido.
- Se não existir, ou pertencer a outro usuário, retorna `204` sem alterar o banco (não vaza existência).

**Response `204`** (sempre, exceto erros de auth).

---

## 🛡️ Rotas — Admin

Todas com `Authorization: Bearer <accessToken>` + `role = 'ADMIN'`. Erros `401`/`403`/`400` seguem o padrão do resto do admin.

### `POST /api/admin/notifications/preview` — contar destinatários

Permite que o admin veja **quantos usuários atendem ao filtro** e **quantos têm o app instalado** antes de confirmar o envio. Importante pra broadcasts grandes.

**Request**
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

**Response `200`**
```json
{ "totalRecipients": 423, "totalWithPushToken": 287 }
```

Significado:
- `totalRecipients` — usuários únicos que casam com `audience`.
- `totalWithPushToken` — destes, quantos têm ≥1 `PushToken` cadastrado. **É o número real de usuários que receberão** a notificação (o envio será multiplicado pelo nº de tokens por usuário).

### `POST /api/admin/notifications/send` — disparar

**Request**
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

**Validações (Zod)**
- `title` 1..120 chars.
- `body` 1..240 chars.
- `audience.type` obrigatório, com discriminated union (ver §Audiência).
- `data` é qualquer objeto JSON serializável; campos sugeridos para deep link em §Convenção de `data`.
- `sound`: `"default" | null` (default = `"default"`).
- `badge`: inteiro ≥ 0 (apenas iOS — Android ignora).

**Comportamento**
1. Resolve `audience` em uma lista de `userIds`.
2. Busca todos os `PushToken` desses usuários (1..N por usuário).
3. Monta mensagens Expo (`channelId: 'default'`) e envia em chunks via `expo.chunkPushNotifications` + `sendPushNotificationsAsync`.
4. **Remoção automática** de tokens com `details.error === 'DeviceNotRegistered'`.
5. Persiste um `NotificationLog` com contadores agregados.

**Response `200`**
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

### `GET /api/admin/notifications` — histórico

Lista paginada do que foi disparado, mais recente primeiro.

**Query**
- `page` (int ≥ 1, default `1`)
- `pageSize` (int 1..100, default `20`)

**Response `200`**
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "...",
      "body": "...",
      "data": { ... },
      "audienceType": "ATHLETE_FILTER",
      "audiencePayload": { "type": "ATHLETE_FILTER", "filters": { ... } },
      "sentByUserId": "uuid",
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

### `GET /api/admin/notifications/:id` — detalhe

**Response `200`** — mesmo formato de um item da listagem, envolvido em `{ notification: { ... } }`.

**Erros**
- `404` — `id` não encontrado (`NotificationNotFoundError`).

---

## 🎯 Audiência

`audience` é uma **discriminated union** pelo campo `type`:

```ts
type Audience =
  | { type: 'ALL' }
  | { type: 'USER_IDS'; userIds: string[] }
  | { type: 'ATHLETE_FILTER'; filters: AthleteAudienceFilters }
```

### `ALL`
Todos os usuários do banco (qualquer `role`).

### `USER_IDS`
```json
{ "type": "USER_IDS", "userIds": ["uuid-1", "uuid-2"] }
```
IDs que não existirem são descartados silenciosamente — o `totalRecipients` reflete somente os IDs válidos. Use a tela de listagem (`GET /admin/users` ou `GET /admin/athletes`) para escolher.

### `ATHLETE_FILTER`
Reaproveita **os mesmos filtros de `GET /admin/athletes`** (`src/http/controllers/admin/list-athletes.ts`). Aplicam-se apenas a usuários com `role = 'ATHLETE'`.

| Campo | Tipo | Notas |
|---|---|---|
| `gender` | `'MALE' \| 'FEMALE' \| 'OTHER'` | |
| `primaryPosition` | `'GOALKEEPER' \| 'DEFENDER' \| 'MIDFIELDER' \| 'FORWARD'` | |
| `dominantFoot` | `'RIGHT' \| 'LEFT'` | |
| `classification` | `'DESENVOLVIMENTO' \| 'PERFORMANCE' \| 'UNCLASSIFIED'` | `UNCLASSIFIED` retorna atletas com perfil porém sem classificação. |
| `currentClub` | `string` | match case-insensitive por `contains`. |
| `minAge` / `maxAge` | `int` | inclusivo. |
| `minHeight` / `maxHeight` | `number` | em metros. |
| `minWeight` / `maxWeight` | `number` | em kg. |

Para "todos os atletas com app instalado" use `{ "type": "ATHLETE_FILTER", "filters": {} }`.

---

## 🔗 Convenção do `data` (deep link)

Para que o app abra a tela certa ao tocar na notificação, padronize:

```json
{
  "type": "<categoria>",
  "screen": "/(private)/(tabs)/profile",
  "params": { "id": "..." }
}
```

| `type` | Quando | Tela alvo (exemplo) |
|---|---|---|
| `tournament` | novo torneio | rota de torneios |
| `favorite` | alguém favoritou seu perfil | perfil do atleta |
| `scout` | observador visualizou seu perfil | perfil do atleta |
| `subscription` | atualização da assinatura | aba de plano |
| `admin_broadcast` | comunicado genérico do admin | home |

O frontend usa `data.screen` e `data.params` para chamar `router.push()`.

---

## 🧪 Testando manualmente

1. Build mobile com EAS (`eas build --profile development`).
2. Login no app → conferir registro do token em `push_tokens` (via Prisma Studio).
3. Disparar via [Expo Push Tool](https://expo.dev/notifications) colando o token, ou via:
   ```bash
   curl -X POST http://localhost:3333/api/admin/notifications/send \
     -H "Authorization: Bearer $ADMIN_JWT" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Teste",
       "body": "Mensagem",
       "audience": { "type": "USER_IDS", "userIds": ["<meu-userId>"] }
     }'
   ```
4. App em background → banner deve abrir o app na `data.screen`.

---

## 📦 Estrutura no repositório

```
src/lib/expo-push.ts                                                  # wrapper do expo-server-sdk (chunks + remoção de DeviceNotRegistered)
src/http/repositories/push-tokens-repository.ts                       # interface
src/http/repositories/prisma/prisma-push-tokens-repository.ts         # impl prod (a criar após migration)
src/http/repositories/in-memory/in-memory-push-tokens-repository.ts   # impl testes
src/http/repositories/notification-logs-repository.ts                 # interface
src/http/repositories/prisma/prisma-notification-logs-repository.ts   # impl prod (a criar após migration)
src/http/repositories/in-memory/in-memory-notification-logs-repository.ts
src/http/use-cases/register-push-token.ts                             # mobile
src/http/use-cases/remove-push-token.ts                               # mobile
src/http/use-cases/admin/resolve-notification-audience.ts             # helper
src/http/use-cases/admin/preview-notification-audience.ts             # admin
src/http/use-cases/admin/send-notification.ts                         # admin
src/http/use-cases/admin/list-notifications.ts                        # admin
src/http/use-cases/admin/get-notification.ts                          # admin
src/http/use-cases/errors/invalid-push-token-error.ts
src/http/use-cases/errors/notification-not-found-error.ts
```

Todos os use-cases têm `.spec.ts` co-localizado com testes Vitest contra os repositórios in-memory — não dependem de banco para rodar.

---

## 🚀 Fora de escopo (fase 2+)

- **Receipts individuais** — usar `getPushNotificationReceiptsAsync` num job 15min após o envio para registrar entrega por destinatário. Requer tabela `NotificationReceipt` e cron.
- **Eventos automáticos** — disparo a partir de regras de negócio (alguém favoritou seu perfil, partida criada, etc.). Hoje só admin dispara manualmente.
- **Preferências por usuário** — toggles de quais categorias receber. Hoje todos recebem tudo.
- **Sons customizados** por categoria, rich media (imagens, ações), notificações locais agendadas.
