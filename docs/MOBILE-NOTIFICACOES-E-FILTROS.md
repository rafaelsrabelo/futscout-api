# Notificações do observador e filtros de classificação — execução mobile

Plano para o time mobile ligar a aba de notificações e completar os filtros do Explorar.

> **Resumo executivo:** o backend está inteiro no ar — quatro endpoints, push via Expo, agregação anti-spam e deep link por tipo. O app já registra o token de push e já tem o sino no header apontando para `/(private)/notifications`, mas a tela é um stub com array vazio. **Há um desencontro no deep link que precisa ser resolvido antes de tudo** (seção 2). Depois, é consumir os endpoints e completar seis filtros defasados.
>
> O contrato completo dos endpoints está em [NOTIFICACOES-OBSERVADOR-E-CLASSIFICACAO.md](./NOTIFICACOES-OBSERVADOR-E-CLASSIFICACAO.md#3-contrato-dos-endpoints-para-o-mobile).

---

## 1. O que já está pronto dos dois lados

| Peça | Onde |
|---|---|
| 4 endpoints de notificação | backend ✅ |
| Push via Expo, com `data` de deep link | backend ✅ |
| Agregação: 8 lances viram 1 notificação e 1 push | backend ✅ |
| Registro do token de push | `usePushNotifications.ts` ✅ |
| Listener de toque no push | `usePushNotifications.ts` ✅ |
| Sino no header → `/(private)/notifications` | `AppHeader/index.tsx` ✅ |
| **A tela de notificações** | ❌ stub com `TODO` |
| **Badge de não lidas** | ❌ |
| **Filtros novos no Explorar** | ❌ |

---

## 2. ⚠️ O desencontro do deep link — resolver primeiro

O listener em `usePushNotifications.ts` faz:

```ts
router.push({ pathname: data.screen as never, params: data.params });
```

Ou seja, usa o `screen` **direto como rota**. Mas o backend manda um nome *lógico*, não um caminho do Expo Router:

| O backend manda | A rota real do app |
|---|---|
| `{ screen: 'athlete', params: { athleteId } }` | `/(private)/athlete/[id]` com `{ id }` |
| `{ screen: 'match', params: { matchId } }` | `/(private)/matches/[id]` com `{ id }` |

`router.push({ pathname: 'athlete' })` não resolve. **Hoje o toque no push não navega para lugar nenhum.**

Isso é de propósito do lado do backend: ele não deve conhecer a estrutura de rotas do Expo Router — se o app reorganizar as pastas, todas as notificações já enviadas apontariam para o vazio. O nome lógico é um contrato estável.

**A correção fica no app:** uma função de mapeamento, usada tanto pelo listener do push quanto pelo toque na lista.

```ts
// src/shared/utils/notification-link.ts
type NotificationData = { screen?: string; params?: Record<string, string> };

export function resolveNotificationRoute(data?: NotificationData) {
  if (!data?.screen) return null;

  switch (data.screen) {
    case 'athlete':
      return data.params?.athleteId
        ? { pathname: '/(private)/athlete/[id]', params: { id: data.params.athleteId } }
        : null;
    case 'match':
      return data.params?.matchId
        ? { pathname: '/(private)/matches/[id]', params: { id: data.params.matchId } }
        : null;
    default:
      // Tipo novo que este build não conhece — abre a lista em vez de quebrar.
      return { pathname: '/(private)/notifications', params: {} };
  }
}
```

> **Por que o `default` importa:** se amanhã o backend passar a mandar um `screen` novo, um app antigo na loja não pode travar. Cair na lista de notificações é degradação aceitável.

---

## 3. Fase B — a aba de notificações

### B1 — Service

**Arquivo novo:** `src/shared/services/notifications.service.ts`, no molde do `scoutChat.service.ts`.

```ts
export interface UserNotification {
  id: string;
  type: 'FAVORITE_MATCH' | 'FAVORITE_PLAY';
  title: string;
  body: string;
  data: { screen?: string; params?: Record<string, string> } | null;
  actorAthleteId: string | null;
  eventCount: number;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

listNotifications({ page, limit, onlyUnread })  // GET /notifications
getUnreadCount()                                 // GET /notifications/unread-count
markNotificationRead(id)                         // PATCH /notifications/:id/read
markAllNotificationsRead()                       // POST /notifications/read-all
```

> **Trate `type` como aberto.** Hoje são dois valores, mas vão surgir outros. Um `switch` sem `default` no ícone quebra a lista inteira quando chegar um tipo novo — use um ícone genérico de fallback.

### B2 — Hooks

**Arquivo novo:** `src/shared/hooks/useNotifications.ts`

- `useNotifications()` — `useInfiniteQuery` com `queryKey: ['notifications']`
- `useUnreadCount()` — `useQuery` com `queryKey: ['notifications-unread']`, para o badge
- `useMarkNotificationRead()` — mutation invalidando as duas chaves acima

O `GET /notifications` devolve `unreadCount` junto, então dá para semear o badge a partir da lista e evitar uma chamada quando a tela está aberta.

### B3 — A tela

**Arquivo:** `src/app/(private)/notifications.tsx` — hoje tem `TODO: Implementar busca de notificações do backend quando disponível` e um array vazio.

O layout, os ícones por tipo e o estado vazio **já estão escritos** na tela. É trocar o array pelo hook. Os tipos que ela já prevê (`'match'`, `'favorite'`) mapeiam para `FAVORITE_MATCH` e `FAVORITE_PLAY`.

Acrescentar: pull-to-refresh, scroll infinito e um botão "marcar todas como lidas".

### B4 — Badge no sino

O sino já existe no `AppHeader`. Falta o contador vindo de `useUnreadCount()`. Um ponto vermelho já resolve; número exato é melhor.

### B5 — Toque na notificação

1. Chamar `markNotificationRead(id)` — não bloqueie a navegação esperando a resposta
2. Navegar com o `resolveNotificationRoute(notification.data)` da seção 2

> **Navegue sempre pelo `data`, nunca deduza pelo `type`.** Uma notificação `FAVORITE_MATCH` que agregou duas partidas tem o `data` reescrito pelo backend para o perfil do atleta — apontar para uma das partidas seria mentira. O `type` continua `FAVORITE_MATCH` para o ícone; quem manda no destino é o `data`.

### B6 — Interruptor nas configurações

`PUT /observer/profile` com `{ "notifyOnFavoriteActivity": false }`. Um switch em "Configurações" do observador.

### B7 — Push chegando com o app aberto

O `usePushNotifications.ts` já tem o listener. Acrescentar: ao receber, invalidar `['notifications']` e `['notifications-unread']` para a lista e o badge atualizarem sem o usuário fazer nada.

### B8 — Decisão de navegação: aba ou sino?

Você falou em "aba". Hoje as tabs são **home, explorar, create, favoritos, perfil** — cinco, mais o slot central. Uma sexta aba aperta bastante o rodapé.

**Minha recomendação: manter no sino do header, com badge.** É o padrão que o usuário já conhece de outros apps, o sino já existe e já navega, e não custa espaço no rodapé. Se você preferir a aba mesmo assim, é trocar o arquivo de lugar para `(tabs)/` — mas vale olhar como fica o rodapé com seis itens antes.

---

## 4. Fase C — filtros do Explorar

### C1 — Completar o tipo

**Arquivo:** `src/shared/interfaces/athletes.ts`. O `AthleteFilters` está defasado em **seis** campos que o backend já aceita há tempos:

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
+   minAge?: number;
+   maxAge?: number;
+   currentClub?: string;
+   name?: string;
    page?: number; limit?: number;
  }
```

### C2 — Repassar no service

`src/shared/services/athletes.service.ts` monta os params um a um (`if (filters.primaryPosition) params.primaryPosition = ...`). Acrescentar os seis.

> **Cuidado com `hasManager` e os numéricos:** `if (filters.hasManager)` descarta `false`, que é um filtro válido ("sem empresário"). Use `!== undefined`. Mesma coisa para `minAge: 0`.

### C3 — Chips de classificação

Dois chips no painel de filtros avançados: **Desenvolvimento** e **Performance**. É a classificação que o admin dá ao atleta via `POST /admin/athletes/:id/classification`.

### C4 — Fechar o círculo com o chat

O Helper IA **já** monta buscas por classificação e por idade. Depois de C1 e C2, confira que uma busca salva no chat com esses critérios abre no Explorar mostrando todos os filtros aplicados — hoje eles chegam no `filters` da busca salva e o app simplesmente os ignora.

---

## 5. Ordem sugerida

1. **Seção 2** (mapeamento do deep link) — sem isso o push não leva a lugar nenhum
2. **C1 + C2** — mecânico, meia hora, e conserta a busca salva do chat
3. **B1 → B5** — o grosso da aba
4. B6, B7, C3 — acabamento

Fases B e C são independentes; dá para tocar em paralelo.

---

## 6. Como validar

- Favoritar um atleta, e com outro usuário cadastrar uma partida com ele → push chega e o toque **abre a partida**
- Publicar 3 lances seguidos → **uma** notificação com "publicou 3 novos lances" e **um** push
- Tocar na notificação → some do estado "não lida" e o badge diminui
- Desligar o interruptor → não chega mais nada
- Buscar "Performance" no Explorar → devolve os mesmos atletas que o chat devolve para "atletas de performance"

---

## 7. Pré-requisito

A migration `20260728190000_add_user_notifications` precisa estar aplicada no ambiente. Sem ela, além das notificações, o `GET /observer/profile` quebra — ela adiciona uma coluna nesse perfil.
