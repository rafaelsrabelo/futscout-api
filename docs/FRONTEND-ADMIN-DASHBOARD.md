# 📊 Admin — Dashboard e Métricas (Frontend)

Guia de integração dos endpoints `/api/admin/dashboard/*` para o painel admin. Cobre os 4 endpoints que alimentam cards, gráficos e tabelas de retenção.

Todos exigem `Authorization: Bearer <accessToken>` com `role = 'ADMIN'`.

---

## 📍 Mapa rápido

| Uso | Método | Path |
|---|---|---|
| Cards principais (snapshot + período) | `GET` | `/api/admin/dashboard/overview` |
| Gráfico de crescimento (série temporal) | `GET` | `/api/admin/dashboard/user-growth` |
| Contadores de atividade (7/30/90d) | `GET` | `/api/admin/dashboard/user-activity` |
| Distribuição de inatividade (buckets) | `GET` | `/api/admin/dashboard/inactivity-buckets` |

---

## 1. Overview — cards do topo

```
GET /api/admin/dashboard/overview?periodDays=30
```

| Query | Tipo | Default |
|---|---|---|
| `periodDays` | int 1–365 | `30` |

**Resposta (200):**

```json
{
  "totals": {
    "athletes": 1240,
    "observers": 58,
    "matches": 4312,
    "plays": 31578,
    "achievements": 640,
    "activeSubscriptions": 87
  },
  "period": {
    "days": 30,
    "from": "2026-03-21T19:42:15.000Z",
    "to": "2026-04-20T19:42:15.000Z",
    "newAthletes": 84,
    "newObservers": 6,
    "newMatches": 412,
    "newPlays": 3109
  }
}
```

**Como usar no painel:**
- **Cards "Total"**: `totals.athletes`, `totals.observers`, `totals.matches`, `totals.plays`.
- **Cards "Nos últimos 30d"**: `period.newAthletes`, `period.newMatches`, etc.
- **Card "Assinaturas ativas"**: `totals.activeSubscriptions`.
- Mudar o seletor de período (7d/30d/90d) = novo fetch com `periodDays`.

---

## 2. User Growth — gráfico de crescimento

```
GET /api/admin/dashboard/user-growth?period=daily&from=2026-03-01&to=2026-04-20
```

| Query | Tipo | Default |
|---|---|---|
| `period` | `daily \| weekly \| monthly` | `daily` |
| `from` | ISO date | `hoje - 30d` |
| `to` | ISO date | `hoje` |

**Resposta (200):**

```json
{
  "period": "daily",
  "from": "2026-03-21T00:00:00.000Z",
  "to": "2026-04-20T00:00:00.000Z",
  "series": [
    { "bucket": "2026-03-21T00:00:00.000Z", "newAthletes": 3, "newObservers": 0, "total": 3 },
    { "bucket": "2026-03-22T00:00:00.000Z", "newAthletes": 0, "newObservers": 0, "total": 0 },
    { "bucket": "2026-03-23T00:00:00.000Z", "newAthletes": 5, "newObservers": 1, "total": 6 }
  ]
}
```

**Erros:**
- `400 { "message": "Max range for user growth is 365 days." }` quando `to - from > 365 dias`.

**Como usar:**
- **Recharts / ApexCharts:** mapear `series` direto. Eixo X = `bucket`, barras empilhadas = `newAthletes` + `newObservers`, linha = `total`.
- **Buckets vazios vêm com `0`** — não precisa preencher no frontend.
- Trocar `period` pra `monthly` em visualizações de 6m+ pra evitar ruído.

---

## 3. User Activity — contadores de atividade

```
GET /api/admin/dashboard/user-activity
```

Sem query params. Sempre calcula em cima de `lastLoginAt` no momento da request.

**Resposta (200):**

```json
{
  "total": 1305,
  "activeLast7d": 412,
  "activeLast30d": 890,
  "activeLast90d": 1078,
  "inactiveOver30d": 415,
  "inactiveOver90d": 210,
  "neverLoggedIn": 17,
  "activePercent30d": 68.2
}
```

**Semântica:**
- `activeLastNd` = users com `lastLoginAt >= now - Nd`.
- `inactiveOverNd` = users com `lastLoginAt < now - Nd` (**exclui** quem nunca logou).
- `neverLoggedIn` = users com `lastLoginAt = null`.
- `activePercent30d` = `round(activeLast30d / total * 100, 2)`.

**Como usar:**
- **Card "% ativos (30d)"** com `activePercent30d`.
- **Barra de progresso** 7d/30d/90d mostrando `active*` sobre `total`.
- **Alerta "Nunca logaram"**: se `neverLoggedIn > threshold`, destaque visual.

---

## 4. Inactivity Buckets — distribuição de retenção

```
GET /api/admin/dashboard/inactivity-buckets
```

Sem query params. Buckets fixos e imutáveis no backend.

**Resposta (200):**

```json
{
  "buckets": [
    { "label": "0-7d",    "minDays": 0,    "maxDays": 7,   "count": 412 },
    { "label": "7-30d",   "minDays": 7,    "maxDays": 30,  "count": 478 },
    { "label": "30-90d",  "minDays": 30,   "maxDays": 90,  "count": 188 },
    { "label": "90-180d", "minDays": 90,   "maxDays": 180, "count": 135 },
    { "label": "180d+",   "minDays": 180,  "maxDays": null,"count": 75  },
    { "label": "never",   "minDays": null, "maxDays": null,"count": 17  }
  ],
  "total": 1305
}
```

**Como usar:**
- **Gráfico de barras horizontais** (retenção clássico): eixo Y = `label`, eixo X = `count`.
- **Donut/Pie**: opcional, funciona melhor se agrupar `0-7d + 7-30d` como "ativos".
- **Labels prontos pra UI** — não precisa reformatar (`0-7d`, `7-30d`...).

---

## 🔄 Estratégia de fetch e cache

- Os 4 endpoints fazem counts paralelos (`Promise.all`) — latência esperada < 200ms em DB saudável.
- **`/overview`** é seguro refetchar a cada mudança de período (seletor 7/30/90).
- **`/user-growth`** deve ser memoizado por `{period, from, to}` no frontend (TanStack Query) — cai naturalmente em cache.
- **`/user-activity`** e **`/inactivity-buckets`** são snapshots de momento — refresh manual ou a cada ~5min via `refetchInterval`.

---

## ✅ Checklist de integração

- [ ] Tab **"Visão geral"** do painel consome `/overview` com seletor de período
- [ ] Gráfico de crescimento usa `/user-growth` com toggle `daily | weekly | monthly`
- [ ] Cards de atividade (`active7d`, `active30d`, etc.) vindos de `/user-activity`
- [ ] Gráfico de retenção (barras) usando `/inactivity-buckets`
- [ ] Estado de loading + skeleton em cada card/gráfico
- [ ] Toast "Faixa de datas muito grande" quando `/user-growth` retornar `400` (range > 365d)
- [ ] Auto-refresh opcional (5–10 min) nos 4 endpoints pra manter o painel fresco
