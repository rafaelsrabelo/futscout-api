# Aba de notificações do observador + filtro de classificação

Plano para a aba de notificações no app e para levar a classificação (Desenvolvimento / Performance) ao Explorar e ao Helper IA.

> **Resumo executivo:** o **backend está pronto**. Os quatro endpoints, o push, a agregação anti-spam e os gatilhos de partida, lance e anexo de vídeo estão no ar; o deep link varia por tipo (partida abre a partida, lance abre o perfil). O filtro de classificação **já funciona no Helper IA e no `GET /athletes`**. O que falta é tudo no app: (a) consumir os endpoints e montar a aba; (b) mandar `classification` — e mais cinco filtros defasados — na busca do Explorar.

Auditoria feita sobre `main` em 28/07/2026.

---

## 1. O que já existe

### Notificações — backend pronto

| Peça | Onde |
|---|---|
| Tabela `user_notifications` + preferência no perfil | migration `20260728190000` |
| `GET /api/notifications` (paginado, filtro de não lidas) | `controllers/notifications/` |
| `GET /api/notifications/unread-count` | idem |
| `PATCH /api/notifications/:id/read` | idem |
| `POST /api/notifications/read-all` | idem |
| Push via Expo, com deep link | `notify-favorite-activity.ts` |
| Agregação anti-spam (janela de 30 min) | idem |
| Interruptor `notifyOnFavoriteActivity` no perfil | `PUT /observer/profile` |
| Gatilho no anexo de vídeo, com `aggregateOnly` | `update-play-video-url.ts` |
| Deep link por tipo | `buildDeepLink` |
| 14 testes | `notify-favorite-activity.spec.ts` |

### Classificação — já chega no Helper IA

O `classification` já está no schema da tool `search_athletes` e listado no prompt como critério válido. **Pedir "atletas de performance" para o Helper IA já funciona hoje** — nada a fazer aqui.

O `GET /athletes` também já aceita `classification` como query param, e o admin já classifica via `POST /admin/athletes/:id/classification`.

---

## 2. As lacunas que encontrei

### L1 — "Adicionar vídeo" não notifica · **RESOLVIDO**

Você citou vídeo explicitamente, e é justamente o caso que escapou.

Existem quatro caminhos para conteúdo novo, e três notificam:

| Rota | Notifica? |
|---|---|
| `POST /matches` | ✅ |
| `POST /plays` (standalone) | ✅ |
| `POST /plays/with-url` | ✅ |
| **`PUT /plays/:playId/video-url`** | ✅ *(era ❌ — resolvido abaixo)* |

O último é o fluxo **preferido** segundo o `CLAUDE.md`: o app pede URL assinada, sobe o vídeo direto para o R2 e depois anexa. Se o lance nasce sem vídeo e o vídeo chega nesse segundo passo, o observador nunca é avisado do vídeo.

**Cuidado no desenho:** notificar aqui do jeito ingênuo gera contagem errada. Criar o lance e anexar o vídeo são dois eventos do *mesmo* conteúdo — a agregação somaria "publicou 2 novos lances" quando foi um só.

**Feito:** `PUT /plays/:playId/video-url` dispara com `aggregateOnly: true`. Se já existe notificação aberta do mesmo grupo na janela, o anexo **não faz nada** — o observador já foi avisado; se não existe, cria normal. O lance que nasce completo notifica uma vez, e o que nasce vazio notifica quando o vídeo chega.

### L2 — Conquistas e histórico de times não notificam · **decidido: fica de fora**

Seu "e etc..." provavelmente inclui isso. `POST /achievements` e `POST /team-history` não disparam nada.

**Decisão tomada: fica de fora.** Conquista e time novo são eventos de cadastro, não de desempenho — é o que o olheiro quer ver *no perfil*, não o que justifica vibrar o celular dele. Somar tipos agora é o caminho mais rápido para o observador desligar as notificações. Se um dia o uso mostrar que faz falta, é barato: dois gatilhos e dois valores no enum.

### L3 — Sem doc mobile das notificações

O time não tem o contrato dos quatro endpoints nem o formato do deep link. É o que trava a aba.

### L4 — O Explorar não manda `classification`

O backend aceita; o app não envia. O `AthleteFilters` de `src/shared/interfaces/athletes.ts` está defasado — faltam **seis** campos que o backend já suporta:

```diff
  export interface AthleteFilters {
    nickname?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    dominantFoot?: 'RIGHT' | 'LEFT';
    minHeight?: number; maxHeight?: number;
    minWeight?: number; maxWeight?: number;
    primaryPosition?: 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD';
    hasManager?: boolean;
+   secondaryPosition?: 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD';
+   classification?: 'DESENVOLVIMENTO' | 'PERFORMANCE';
+   minAge?: number; maxAge?: number;
+   currentClub?: string;
+   name?: string;
    page?: number; limit?: number;
  }
```

Vale corrigir todos de uma vez: hoje o Helper IA consegue montar buscas por idade e classificação que o Explorar não consegue reproduzir, e uma busca salva pelo chat abre no app sem alguns filtros aparecerem.

---

## 3. Contrato dos endpoints (para o mobile)

Tudo autenticado, `Authorization: Bearer <accessToken>`.

### `GET /api/notifications?page=1&limit=20&onlyUnread=false`

```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "FAVORITE_MATCH",
      "title": "Nova partida",
      "body": "Joãozinho cadastrou uma nova partida.",
      "data": { "screen": "athlete", "params": { "athleteId": "uuid" } },
      "actorAthleteId": "uuid",
      "eventCount": 1,
      "read": false,
      "readAt": null,
      "createdAt": "2026-07-28T12:00:00.000Z"
    }
  ],
  "total": 34,
  "unreadCount": 5,
  "page": 1,
  "limit": 20
}
```

| Campo | Uso na tela |
|---|---|
| `type` | `FAVORITE_MATCH` ou `FAVORITE_PLAY` — escolhe o ícone. A tela já prevê `'match'` e `'favorite'`. |
| `title` / `body` | Texto pronto em pt-BR. Renderize como veio. |
| `data` | Deep link do toque. Varia por tipo — ver seção 6. Navegue por ele, não deduza pelo `type`. |
| `eventCount` | Quantos eventos foram agrupados. `> 1` já vem refletido no `body` ("publicou 3 novos lances") — não precisa exibir separado. |
| `read` | Estado visual. |
| `unreadCount` | Vem junto na listagem, para o badge não precisar de outra chamada. |

### `GET /api/notifications/unread-count` → `{ "unreadCount": 5 }`

Endpoint enxuto para o badge da tab bar, que é consultado com frequência.

### `PATCH /api/notifications/:id/read` → `{ "unreadCount": 4 }`

Idempotente. Marcar uma já lida não é erro. **404** se a notificação não for do usuário.

### `POST /api/notifications/read-all` → `{ "markedCount": 5, "unreadCount": 0 }`

### `PUT /api/observer/profile` — desligar os avisos

```json
{ "notifyOnFavoriteActivity": false }
```

---

## 4. Como o observador é notificado

Vale o time mobile entender o modelo, porque ele explica comportamentos que parecem bug:

- **Só quem favoritou o atleta recebe.** Sem favorito, sem notificação.
- **Rajada vira uma notificação só.** Um atleta que sobe 8 lances gera **uma** notificação com `eventCount: 8` e **um** push, não 8. A janela é de 30 minutos.
- **Notificação já lida não agrega.** Se o observador leu e o atleta publica de novo, nasce uma nova — ele merece saber.
- **Push é o extra, a caixa de entrada é o que dura.** Observador sem token de push continua acumulando notificações na aba.
- **Nunca derruba o cadastro do atleta.** O disparo é fire-and-forget: se a Expo cair, o atleta nem percebe.

---

## 5. Plano

### Fase A — fechar o backend · **CONCLUÍDA**

| # | Tarefa | Esforço |
|---|---|---|
| ~~A1~~ | ~~Gatilho em `PUT /plays/:playId/video-url` com `aggregateOnly`~~ — **feito** | — |
| ~~A2~~ | ~~Deep link por tipo: partida abre a partida~~ — **feito** | — |
| ~~A3~~ | ~~Testes~~ — **feito**, 4 novos (14 no total) | — |

### Fase B — aba de notificações no app

| # | Tarefa |
|---|---|
| B1 | `notifications.service.ts` com os 4 métodos |
| B2 | Hook `useNotifications` (lista paginada) + `useUnreadCount` para o badge |
| B3 | Trocar o stub de `notifications.tsx` pela lista real — hoje é `TODO` com array vazio |
| B4 | Badge na tab bar consumindo `unread-count` |
| B5 | Toque → marca como lida → navega pelo `data.screen` |
| B6 | Interruptor nas configurações do observador (`notifyOnFavoriteActivity`) |
| B7 | Push recebido em foreground → invalidar o cache da lista e do badge |

### Fase C — classificação no Explorar

| # | Tarefa |
|---|---|
| C1 | Completar `AthleteFilters` no app com os 6 campos que faltam (L4) |
| C2 | Repassar os novos filtros em `athletes.service.ts` |
| C3 | Chips de Desenvolvimento / Performance no painel de filtros avançados |
| C4 | Conferir que a busca salva pelo chat abre no Explorar com todos os filtros visíveis |

Fases B e C são independentes entre si e da A — dá para tocar em paralelo.

---

## 6. Decisões tomadas

1. **Conquista e histórico de times NÃO viram notificação**, por fadiga. Reversível quando o uso pedir.
2. **O deep link varia por tipo:**

| Tipo | `data.screen` | Abre |
|---|---|---|
| `FAVORITE_MATCH` | `match` + `matchId` | A partida |
| `FAVORITE_PLAY` | `athlete` + `athleteId` | O perfil do atleta |
| Qualquer um, **depois de agregar** | `athlete` + `athleteId` | O perfil |

A última linha é sutil e o app precisa respeitá-la: quando duas partidas viram uma notificação só, linkar uma delas seria mentira — o backend reescreve o `data` para o perfil. **Navegue sempre pelo `data` que veio, nunca deduza pelo `type`.**

---

## 7. Pré-requisito

A migration `20260728190000_add_user_notifications` precisa estar aplicada no ambiente. Sem ela, além das notificações, o `GET /observer/profile` quebra — ela adiciona uma coluna nesse perfil e o Prisma seleciona todas as colunas.
