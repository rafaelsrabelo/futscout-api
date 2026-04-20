# Backend Tasks

> All server-side tasks: Prisma schema changes, Fastify routes, use cases, repositories, Stripe/R2/OpenAI integrations, admin endpoints.
> Every task here assumes the Controller → Use Case → Repository architecture described in `ai/rules/architecture.md`.

---

## Complexity Scale

| Label | Meaning |
|-------|---------|
| `XS`  | Trivial config or boilerplate |
| `S`   | Single file, straightforward |
| `M`   | Multiple files or moderate logic |
| `L`   | Complex logic, multiple concerns |
| `XL`  | Cross-cutting, high coordination |

---

## Phase 0 — Autenticação Admin

> Objetivo: permitir que um usuário com `role = 'ADMIN'` autentique-se no sistema existente e que rotas `/api/admin/*` fiquem restritas a ele.
>
> Decisão arquitetural: **reaproveitar** `POST /api/auth/sessions` para login (não criar endpoint novo) e adicionar um gate de role via middleware. Justificativa: mantém um único fluxo de JWT + refresh + blacklist, sem duplicar `AuthenticateUseCase`. O admin será identificado pela `role` no payload do JWT.

---

- [x] **BE-01** | `S` | Adicionar env vars `ADMIN_EMAIL` e `ADMIN_PASSWORD`

  **Descrição:**
  Adicionar `ADMIN_EMAIL` (email válido) e `ADMIN_PASSWORD` (mínimo 8 caracteres) ao schema Zod em `src/env/index.ts`. Ambas obrigatórias em `dev` e `test`; opcionais em `production` (para que produção não falhe no boot caso o admin já exista e as secrets ainda não tenham sido configuradas).

  **Acceptance Criteria:**
  - [x] `ADMIN_EMAIL` validada como `z.string().email()` (opcional quando `NODE_ENV === 'production'`)
  - [x] `ADMIN_PASSWORD` validada com `z.string().min(8)` (opcional quando `NODE_ENV === 'production'`)
  - [x] Falha de boot em dev/test produz mensagem clara apontando as vars faltantes
  - [x] Sem leak das vars em logs ao iniciar

  **Files:**
  - `src/env/index.ts`

  **Depends on:** N/A

---

- [x] **BE-02** | `M` | Criar `seedAdmin()` startup idempotente

  **Descrição:**
  Criar `src/setup/admin.ts` exportando `seedAdmin()`. A função deve (1) consultar via Prisma se já existe `User` com `role === 'ADMIN'`; (2) se não existir e `ADMIN_EMAIL` + `ADMIN_PASSWORD` estiverem presentes em `env`, criar um `User` com `role = 'ADMIN'`, senha hash `bcrypt(..., 6)`, `isProfileComplete = true`, `authProvider = 'CREDENTIALS'`; (3) se já existir ou se as vars estiverem ausentes em produção, apenas logar e retornar. Chamar `seedAdmin()` em `src/server.ts` **depois** de `seedPlans()` e antes de `app.listen`.

  **Acceptance Criteria:**
  - [x] Primeira inicialização (DB limpo + vars definidas) cria exatamente um `User` com `role = 'ADMIN'`
  - [x] Inicializações seguintes não duplicam nem atualizam o admin existente
  - [x] Em produção sem vars definidas, loga aviso e segue (não derruba o servidor)
  - [x] Senha é armazenada com hash bcrypt (cost 6), nunca em texto plano
  - [x] Logs não imprimem `ADMIN_PASSWORD` nem o hash
  - [x] `seedAdmin()` é chamada em `server.ts` após `seedPlans()`

  **Files:**
  - `src/setup/admin.ts` *(novo)*
  - `src/server.ts`

  **Depends on:** `BE-01`

---

- [x] **BE-03** | `S` | Middleware `verifyAdmin`

  **Descrição:**
  Criar `src/http/middlewares/verify-admin.ts` exportando `verifyAdmin(request, reply)`. A middleware assume que `verifyJwt` já rodou antes dela (portanto `request.user` existe) e devolve `403` em PT-BR caso `request.user.role !== 'ADMIN'`. Será usada no formato `{ onRequest: [verifyJwt, verifyAdmin] }` em todas as rotas `/api/admin/*`.

  **Acceptance Criteria:**
  - [x] Request sem JWT válido cai em `401` via `verifyJwt` (comportamento inalterado)
  - [x] Request com JWT válido mas `role !== 'ADMIN'` recebe `403 { message: 'Acesso restrito a administradores.' }`
  - [x] Request com JWT válido e `role === 'ADMIN'` passa sem alterar `request`
  - [x] Middleware não faz queries no banco (a role vem do payload do JWT)

  **Files:**
  - `src/http/middlewares/verify-admin.ts` *(novo)*

  **Depends on:** N/A

---

- [x] **BE-04** | `S` | Rota `GET /api/admin/auth/verify`

  **Descrição:**
  Criar um endpoint leve que o frontend admin chama no carregamento inicial para verificar se o JWT atual ainda é válido e pertence a um admin. Retorna `200 { userId, email, role }` em caso de sucesso. Aproveita `verifyJwt + verifyAdmin`, logo retorna `401` para token inválido/revogado e `403` para usuários não-admin.

  **Acceptance Criteria:**
  - [x] Rota registrada em `src/http/routes.ts` como `GET '/admin/auth/verify'` com `{ onRequest: [verifyJwt, verifyAdmin] }`
  - [x] Handler em `src/http/controllers/admin/verify-admin-session.ts` (ou equivalente em `controllers/admin/`)
  - [x] Retorna `200` com `{ userId, email, role: 'ADMIN' }` lidos via `UsersRepository.findById(request.user.sub)`
  - [x] Retorna `401` se o token está na blacklist ou expirou (comportamento herdado de `verifyJwt`)
  - [x] Retorna `403` se o usuário existe mas não é admin (comportamento herdado de `verifyAdmin`)

  **Files:**
  - `src/http/controllers/admin/verify-admin-session.ts` *(novo)*
  - `src/http/routes.ts`

  **Depends on:** `BE-03`

---

- [x] **BE-05** | `S` | Documentar fluxo de login admin

  **Descrição:**
  Criar `docs/AUTENTICACAO-ADMIN.md` documentando o fluxo: login via `POST /api/auth/sessions` com o email do admin retorna um JWT com `role = 'ADMIN'`; frontend admin usa `GET /api/admin/auth/verify` para validar sessão no boot; logout/refresh seguem os endpoints já existentes. Incluir exemplo de request/response, as env vars necessárias, e o que fazer se a senha do admin precisar ser rotacionada.

  **Acceptance Criteria:**
  - [x] Documento em PT-BR seguindo o estilo de `docs/CRIAR-PARTIDA.md`
  - [x] Seções: visão geral, env vars (`ADMIN_EMAIL`, `ADMIN_PASSWORD`), endpoint de login com payload de exemplo, endpoint `GET /api/admin/auth/verify`, como rotacionar a senha do admin em produção (update manual no banco, já que `seedAdmin` é idempotente)
  - [x] Referencia `ai/rules/security.md` para políticas gerais (blacklist, bcrypt, JWT)

  **Files:**
  - `docs/AUTENTICACAO-ADMIN.md` *(novo)*

  **Depends on:** `BE-04`

---

- [x] **BE-06** | `S` | Teste do `seedAdmin` com repositório in-memory

  **Descrição:**
  Refatorar `seedAdmin()` para aceitar, opcionalmente, uma `UsersRepository` e as credenciais via parâmetro (composição injetável mantendo backwards-compat: sem parâmetros, usa Prisma + env). Adicionar `src/setup/admin.spec.ts` cobrindo: (1) cria admin quando não existe; (2) idempotente quando já existe; (3) não cria e loga aviso quando credenciais ausentes.

  **Acceptance Criteria:**
  - [x] `seedAdmin(deps?: { usersRepository?: UsersRepository, email?: string, password?: string })` aceita injeção opcional
  - [x] Três testes passando com `InMemoryUsersRepository`, sem tocar Prisma nem `env`
  - [x] Senha persistida é `bcrypt` hash (verificável via `compare`)

---

## Phase 1 — Admin: Gestão de Atletas

> Objetivo: endpoints `/api/admin/athletes/*` que o painel admin consome para listar, buscar, filtrar e inspecionar atletas com informações mais ricas do que as exibidas nas apps de atleta/olheiro.
>
> Todas as rotas desta fase usam `{ onRequest: [verifyJwt, verifyAdmin] }`. Controllers vão em `src/http/controllers/admin/`, use cases em `src/http/use-cases/admin/`, e métodos novos nas repositories existentes (`AthleteProfileRepository`, `UsersRepository`) quando necessário.

---

- [x] **BE-07** | `L` | `GET /api/admin/athletes` — lista paginada com busca e filtros avançados

  **Descrição:**
  Listagem admin de atletas com paginação real (cursor ou offset — manter consistência com `listAthletes` existente), busca textual por nome (`q`) e filtros combinados: `position` (`GOALKEEPER | DEFENDER | MIDFIELDER | FORWARD`), `category` (`U5..U20 | AMATEUR | PROFESSIONAL`), `minAge` / `maxAge` (derivados de `birthDate`), `city`, `state`, `dominantFoot`. Payload mais completo que `GET /api/athletes`: inclui `email`, `cpf`, `phone`, `createdAt`, `lastLoginAt` (ver BE-16) e contadores rápidos de partidas/lances quando cheap.

  **Nota de implementação:** `category`, `city`, `state` e `phone` não foram implementados por ausência no schema atual (category não existe em `AthleteProfile`; city/state vivem em `Address`; `User` não tem `phone`). Ficam para iterações futuras quando o schema expor esses campos. Implementado: `q`, `gender`, `primaryPosition`, `dominantFoot`, `currentClub`, `hasManager`, `minAge`/`maxAge`, `minHeight`/`maxHeight`, `minWeight`/`maxWeight`.

  **Acceptance Criteria:**
  - [x] Rota `GET '/admin/athletes'` registrada com `{ onRequest: [verifyJwt, verifyAdmin] }`
  - [x] Query params validados com Zod: `page` (default 1), `pageSize` (default 20, max 100), `q`, `primaryPosition`, `minAge`, `maxAge`, `dominantFoot` e demais descritos acima
  - [x] Busca `q` faz ILIKE case-insensitive em `athleteProfile.nickname`, `user.name` e `user.email`
  - [x] Filtro de idade calcula via `birthDate` (admin fornece anos, use case converte para range de datas)
  - [x] Resposta `200`: `{ items, page, pageSize, total, hasMore }` — `total` via `prisma.count` + `findMany` em paralelo
  - [x] `items[]` inclui campos sensíveis (email, cpf) que NÃO aparecem em rotas públicas; `lastLoginAt` emitido como `null` até BE-16
  - [x] Ordenação default: `createdAt desc`
  - [x] Use case `ListAthletesAdminUseCase` com repositório injetado; 5 testes verdes com `InMemoryAthleteProfileRepository`

  **Files:**
  - `src/http/controllers/admin/list-athletes.ts` *(novo)*
  - `src/http/use-cases/admin/list-athletes.ts` *(novo)*
  - `src/http/use-cases/admin/list-athletes.spec.ts` *(novo)*
  - `src/http/repositories/athlete-profile-repository.ts` — adicionar método `findManyForAdmin(filters, pagination)`
  - `src/http/repositories/prisma/prisma-athlete-profile-repository.ts`
  - `src/http/repositories/in-memory/in-memory-athlete-profile-repository.ts`
  - `src/http/routes.ts`

  **Depends on:** `BE-03`, `BE-16` (para `lastLoginAt`; se BE-16 não estiver pronto, campo pode ser `null` no payload)

---

- [x] **BE-08** | `M` | `GET /api/admin/athletes/:id` — detalhe completo do atleta

  **Descrição:**
  Retorna o perfil completo de um atleta junto com contadores agregados: total de partidas, total de lances por tipo (goals, assists, etc.), total de conquistas, total de times no histórico, status da assinatura atual, `lastLoginAt`, `emailVerified`. Essa tela no admin é a "página de configurações do atleta".

  **Nota de implementação:** `phone` não existe em `User`; `lastLoginAt` permanece ausente até BE-16. Contadores entregues: `matches`, `plays`, `achievements`, `teamHistory` (via `_count` do Prisma) + `playsByType` (via `groupBy`).

  **Acceptance Criteria:**
  - [x] Rota `GET '/admin/athletes/:id'` com guard admin
  - [x] Param `id` é o `athleteProfile.id` (validado como uuid pelo Zod)
  - [x] Resposta inclui: `profile` (todos os campos), `address`, `user` (email, role, emailVerified, isActive, createdAt), `counts` (matches, plays, achievements, teamHistory) + `playsByType`, `subscription` (plan name/price/currency/isUnlimited, status, currentPeriodEnd) ou `null`
  - [x] Retorna `404` quando o atleta não existe

  **Files:**
  - `src/http/controllers/admin/get-athlete.ts` *(novo)*
  - `src/http/use-cases/admin/get-athlete.ts` *(novo)*
  - `src/http/use-cases/admin/get-athlete.spec.ts` *(novo)*
  - `src/http/routes.ts`

  **Depends on:** `BE-03`

---

## Phase 2 — Admin: Gestão de Partidas

> Objetivo: admin pode visualizar partidas de qualquer atleta, buscar/filtrar globalmente, criar e editar partidas em nome de atletas, e corrigir vínculos. Todas as rotas em `/api/admin/matches/*` e `/api/admin/athletes/:id/matches`.

---

- [ ] **BE-09** | `M` | `GET /api/admin/athletes/:athleteId/matches` — histórico de partidas do atleta

  **Descrição:**
  Lista paginada de partidas de um atleta específico com filtros: `competitionId`, `status`, `result`, `from`, `to` (date range). Retorna dados suficientes para a aba "Histórico de Partidas" da tela do atleta (time adversário, placar, data, status, número de lances).

  **Acceptance Criteria:**
  - [ ] Rota `GET '/admin/athletes/:athleteId/matches'` com guard admin
  - [ ] Filtros via query: `page`, `pageSize`, `competitionId`, `status`, `result`, `from`, `to`
  - [ ] Ordenação default: `date desc`
  - [ ] Cada item inclui: `id`, `date`, `adversaryTeam`, `myTeamScore`, `adversaryScore`, `status`, `result`, `playsCount`, `competition.name` quando aplicável
  - [ ] Retorna `404` se o atleta não existe

  **Files:**
  - `src/http/controllers/admin/list-athlete-matches.ts` *(novo)*
  - `src/http/use-cases/admin/list-athlete-matches.ts` *(novo)*
  - `src/http/use-cases/admin/list-athlete-matches.spec.ts` *(novo)*
  - `src/http/repositories/match-repository.ts` — adicionar `findManyByAthlete(athleteProfileId, filters, pagination)` se ainda não existir
  - `src/http/routes.ts`

  **Depends on:** `BE-03`

---

- [ ] **BE-10** | `M` | `GET /api/admin/matches` — busca global de partidas

  **Descrição:**
  Lista paginada que atravessa todos os atletas. Admin busca partidas filtrando por nome do jogador (`q` → ILIKE em `athleteProfile.name/nickname`), posição (`position`), filtros avançados (date range, competition, result, status, idade do atleta). É o endpoint por trás da "busca de partida" no painel.

  **Acceptance Criteria:**
  - [ ] Rota `GET '/admin/matches'` com guard admin
  - [ ] Query params: `page`, `pageSize`, `q`, `athleteId`, `position`, `minAge`, `maxAge`, `competitionId`, `status`, `result`, `from`, `to`
  - [ ] Resposta `{ items, page, pageSize, total, hasMore }`
  - [ ] Cada item inclui o atleta dono (`athleteProfile: { id, name, slug, photoUrl, position }`) para o frontend poder identificar de relance
  - [ ] Ordenação default: `date desc`, secundária por `createdAt desc`

  **Files:**
  - `src/http/controllers/admin/list-matches.ts` *(novo)*
  - `src/http/use-cases/admin/list-matches.ts` *(novo)*
  - `src/http/use-cases/admin/list-matches.spec.ts` *(novo)*
  - `src/http/repositories/match-repository.ts` — adicionar `findManyForAdmin(filters, pagination)`
  - `src/http/repositories/prisma/prisma-match-repository.ts`
  - `src/http/repositories/in-memory/in-memory-match-repository.ts` *(criar se não existir)*
  - `src/http/routes.ts`

  **Depends on:** `BE-03`

---

- [ ] **BE-11** | `S` | `GET /api/admin/matches/:id` — detalhe da partida

  **Descrição:**
  Retorna a partida completa sem o filtro de ownership (admin vê qualquer partida). Inclui atleta dono, time próprio, competição, placar, status, resultado, duração, observações.

  **Acceptance Criteria:**
  - [ ] Rota `GET '/admin/matches/:id'` com guard admin
  - [ ] Resposta inclui: match completo + `athleteProfile` resumido + `myTeam` + `competition` (quando existir) + contador de lances
  - [ ] `404` quando não existe

  **Files:**
  - `src/http/controllers/admin/get-match.ts` *(novo)*
  - `src/http/use-cases/admin/get-match.ts` *(novo — pode reaproveitar o `MatchRepository` existente)*
  - `src/http/routes.ts`

  **Depends on:** `BE-03`

---

- [ ] **BE-12** | `S` | `GET /api/admin/matches/:id/plays` — lances da partida

  **Descrição:**
  Lista todos os lances de uma partida, ordenados por minuto ascendente (ou `createdAt` quando `minute` é `null`). Útil para a tela "ver lance da partida" do admin.

  **Acceptance Criteria:**
  - [ ] Rota `GET '/admin/matches/:id/plays'` com guard admin
  - [ ] Retorna array de plays com: `id`, `type`, `minute`, `description`, `videoUrl`, `thumbnailUrl`, `createdAt`
  - [ ] Ordenação: `minute asc nulls last`, depois `createdAt asc`

  **Files:**
  - `src/http/controllers/admin/list-match-plays.ts` *(novo)*
  - `src/http/routes.ts`
  - `src/http/repositories/play-repository.ts` — adicionar `findManyByMatch(matchId)` se ainda não existir

  **Depends on:** `BE-03`

---

- [ ] **BE-13** | `M` | `POST /api/admin/matches` — admin cria partida vinculada a qualquer atleta

  **Descrição:**
  Admin cria uma partida em nome de um atleta. Difere do `POST /api/matches` normal: recebe `athleteProfileId` explicitamente no body em vez de derivar de `request.user.sub`. Reutiliza o domínio de criação existente — refatorar `CreateMatchUseCase` para aceitar `athleteProfileId` diretamente e mover a resolução de `userId → athleteProfileId` para o controller do atleta.

  **Acceptance Criteria:**
  - [ ] Rota `POST '/admin/matches'` com guard admin
  - [ ] Body Zod: todos os campos de `POST /api/matches` + `athleteProfileId` (uuid, obrigatório)
  - [ ] `CreateMatchUseCase` refatorado para receber `athleteProfileId` em vez de `userId` (mantém backwards-compat via controller de atleta que resolve antes de chamar)
  - [ ] Retorna `201` com a match criada
  - [ ] `404` se `athleteProfileId` não existe
  - [ ] Fluxo normal `POST /api/matches` continua funcionando (regressão zero)

  **Files:**
  - `src/http/controllers/admin/create-match.ts` *(novo)*
  - `src/http/use-cases/create-match.ts` — refatorar assinatura
  - `src/http/controllers/create-match.ts` — adaptar para resolver `userId → athleteProfileId` antes do use case
  - `src/http/use-cases/admin/create-match.spec.ts` *(novo)*
  - `src/http/routes.ts`

  **Depends on:** `BE-03`

---

- [ ] **BE-14** | `S` | `PATCH /api/admin/matches/:id/result` — admin edita resultado/placar

  **Descrição:**
  Endpoint focado em corrigir placar e resultado de uma partida existente. Recalcula `result` automaticamente a partir de `myTeamScore` vs `adversaryScore` quando não fornecido explicitamente. Admin também pode forçar `status = 'FINISHED'` via este endpoint.

  **Acceptance Criteria:**
  - [ ] Rota `PATCH '/admin/matches/:id/result'` com guard admin
  - [ ] Body Zod: `myTeamScore?` (int ≥ 0), `adversaryScore?` (int ≥ 0), `result?` (enum `MatchResult`), `status?` (enum `MatchStatus`)
  - [ ] Se `result` não for enviado e ambos os scores existem, calcula automaticamente
  - [ ] `404` se a partida não existe
  - [ ] Não exige ownership — admin pode editar qualquer partida

  **Files:**
  - `src/http/controllers/admin/update-match-result.ts` *(novo)*
  - `src/http/use-cases/admin/update-match-result.ts` *(novo)*
  - `src/http/use-cases/admin/update-match-result.spec.ts` *(novo)*
  - `src/http/routes.ts`

  **Depends on:** `BE-03`

---

- [ ] **BE-15** | `S` | `POST /api/admin/matches/:id/link-athlete` — reatribuir partida a outro atleta

  **Descrição:**
  Corrige vínculo errado: partida foi criada para o atleta X mas deveria pertencer ao atleta Y. Atualiza `match.athleteProfileId` atomicamente.

  **Acceptance Criteria:**
  - [ ] Rota `POST '/admin/matches/:id/link-athlete'` com guard admin
  - [ ] Body: `athleteProfileId` (uuid, obrigatório)
  - [ ] `404` se a match ou o novo atleta não existem
  - [ ] Retorna a match atualizada

  **Files:**
  - `src/http/controllers/admin/link-match-athlete.ts` *(novo)*
  - `src/http/use-cases/admin/link-match-athlete.ts` *(novo)*
  - `src/http/use-cases/admin/link-match-athlete.spec.ts` *(novo)*
  - `src/http/routes.ts`

  **Depends on:** `BE-03`

---

## Phase 3 — Admin: Dashboard e Métricas

> Objetivo: endpoints que alimentam os cards e gráficos do painel admin. Totais, séries temporais de crescimento, atividade de usuários e buckets de inatividade.

---

- [ ] **BE-16** | `M` | Rastrear `lastLoginAt` no `User`

  **Descrição:**
  Adicionar coluna `lastLoginAt DateTime?` ao model `User` via migração Prisma. Atualizar esse campo em dois pontos: (1) após autenticação bem-sucedida em `AuthenticateUseCase` e `SocialLoginUseCase`; (2) após refresh bem-sucedido em `refresh-token` controller. Sem quebrar cache / custo de DB: só um `update` por login / refresh, não a cada request.

  **Acceptance Criteria:**
  - [ ] Migração Prisma adiciona `lastLoginAt DateTime?` (default `null`) em `users`
  - [ ] `prisma/schema.prisma` atualizado; `npx prisma generate` rodado
  - [ ] `AuthenticateUseCase.execute` atualiza `lastLoginAt = new Date()` após autenticação ok
  - [ ] `SocialLoginUseCase` idem
  - [ ] Controller `refresh-token.ts` atualiza `lastLoginAt` após emissão do novo token
  - [ ] `UsersRepository` ganha método `updateLastLoginAt(userId)` nas duas implementações
  - [ ] Specs existentes de authenticate/register continuam verdes

  **Files:**
  - `prisma/schema.prisma`
  - `prisma/migrations/<timestamp>_add_last_login_at/migration.sql` *(gerado pelo Prisma)*
  - `src/http/repositories/users-repository.ts`
  - `src/http/repositories/prisma/prisma-users-repository.ts`
  - `src/http/repositories/in-memory/in-merory-users-repository.ts`
  - `src/http/use-cases/authenticate.ts`
  - `src/http/use-cases/social-login.ts`
  - `src/http/controllers/refresh-token.ts`

  **Depends on:** N/A

---

- [ ] **BE-17** | `M` | `GET /api/admin/dashboard/overview` — totais e counters de período

  **Descrição:**
  Retorna totais globais (snapshot) e contadores do último período (30d default). Alimenta os cards principais do dashboard admin.

  **Acceptance Criteria:**
  - [ ] Rota `GET '/admin/dashboard/overview'` com guard admin
  - [ ] Query opcional: `periodDays` (default 30, min 1, max 365)
  - [ ] Resposta: `{ totals: { athletes, observers, matches, plays, achievements, activeSubscriptions }, period: { days, newAthletes, newObservers, newMatches, newPlays } }`
  - [ ] Queries em paralelo (`Promise.all`) para reduzir latência

  **Files:**
  - `src/http/controllers/admin/dashboard-overview.ts` *(novo)*
  - `src/http/use-cases/admin/dashboard-overview.ts` *(novo)*
  - `src/http/use-cases/admin/dashboard-overview.spec.ts` *(novo)*
  - `src/http/routes.ts`

  **Depends on:** `BE-03`

---

- [ ] **BE-18** | `M` | `GET /api/admin/dashboard/user-growth` — série temporal de cadastros

  **Descrição:**
  Retorna série temporal de novos cadastros (atletas, olheiros, total) agrupados por dia, semana ou mês. Usado no gráfico de crescimento do painel.

  **Acceptance Criteria:**
  - [ ] Rota `GET '/admin/dashboard/user-growth'` com guard admin
  - [ ] Query Zod: `period` (`daily | weekly | monthly`, default `daily`), `from` (ISO date, default `hoje - 30d`), `to` (default `hoje`)
  - [ ] Resposta: `{ period, from, to, series: [{ bucket: ISODate, newAthletes, newObservers, total }] }`
  - [ ] Buckets vazios aparecem com `0` (não pula datas)
  - [ ] Max range: 365 dias (retorna `400` se exceder)

  **Files:**
  - `src/http/controllers/admin/dashboard-user-growth.ts` *(novo)*
  - `src/http/use-cases/admin/dashboard-user-growth.ts` *(novo)*
  - `src/http/use-cases/admin/dashboard-user-growth.spec.ts` *(novo)*
  - `src/http/routes.ts`

  **Depends on:** `BE-03`

---

- [ ] **BE-19** | `M` | `GET /api/admin/dashboard/user-activity` — atividade e inatividade

  **Descrição:**
  Retorna contadores de usuários por janela de atividade (baseado em `lastLoginAt`): ativo nos últimos 7/30/90 dias, inativo há 30+/90+ dias, nunca logou. Também retorna o total e o percentual de ativos.

  **Acceptance Criteria:**
  - [ ] Rota `GET '/admin/dashboard/user-activity'` com guard admin
  - [ ] Resposta: `{ total, activeLast7d, activeLast30d, activeLast90d, inactiveOver30d, inactiveOver90d, neverLoggedIn, activePercent30d }`
  - [ ] Contadores separados por role (`ATHLETE`, `OBSERVER`, `ADMIN`) quando útil — decidir durante implementação
  - [ ] Query em uma única passada (`CASE WHEN` agregado) para evitar N queries

  **Files:**
  - `src/http/controllers/admin/dashboard-user-activity.ts` *(novo)*
  - `src/http/use-cases/admin/dashboard-user-activity.ts` *(novo)*
  - `src/http/use-cases/admin/dashboard-user-activity.spec.ts` *(novo)*
  - `src/http/routes.ts`

  **Depends on:** `BE-03`, `BE-16`

---

- [ ] **BE-20** | `S` | `GET /api/admin/dashboard/inactivity-buckets` — distribuição de inatividade

  **Descrição:**
  Retorna distribuição dos usuários por "há quanto tempo não logam". Buckets: `0-7d`, `7-30d`, `30-90d`, `90-180d`, `180d+`, `never`. Alimenta o gráfico de retenção.

  **Acceptance Criteria:**
  - [ ] Rota `GET '/admin/dashboard/inactivity-buckets'` com guard admin
  - [ ] Resposta: `{ buckets: [{ label, minDays, maxDays, count }], total }`
  - [ ] Labels e ranges são fixos no backend (não configuráveis via query)
  - [ ] Consistente com `BE-19` (mesma base de cálculo via `lastLoginAt`)

  **Files:**
  - `src/http/controllers/admin/dashboard-inactivity-buckets.ts` *(novo)*
  - `src/http/use-cases/admin/dashboard-inactivity-buckets.ts` *(novo)*
  - `src/http/use-cases/admin/dashboard-inactivity-buckets.spec.ts` *(novo)*
  - `src/http/routes.ts`

  **Depends on:** `BE-03`, `BE-16`

---

## Phase 4 — Admin: Busca Global

> Objetivo: um único endpoint que alimenta o campo "buscar" do topo do painel admin. Usuário digita uma string e vê resultados agrupados (atletas + partidas) sem precisar escolher qual categoria buscar.

---

- [ ] **BE-21** | `M` | `GET /api/admin/search` — busca global unificada

  **Descrição:**
  Endpoint único de busca que varre atletas e partidas ao mesmo tempo. Retorna resultados agrupados por tipo, com poucos itens por grupo (para autocomplete / spotlight). Match em: `athlete.name`, `athlete.nickname`, `athlete.slug`, `user.email` para atletas; `match.adversaryTeam` e `match.athleteProfile.name/nickname` para partidas. Ordenação: mais recentes primeiro dentro de cada grupo.

  **Acceptance Criteria:**
  - [ ] Rota `GET '/admin/search'` com guard admin
  - [ ] Query Zod: `q` (string, min 2, obrigatória), `limit` (int, default 5, max 20 por grupo)
  - [ ] Resposta `200`: `{ athletes: [{ id, name, slug, photoUrl, position, currentClub }], matches: [{ id, date, adversaryTeam, myTeamScore, adversaryScore, athlete: { id, name, photoUrl } }] }`
  - [ ] `q` com menos de 2 chars → `400` com mensagem clara
  - [ ] Busca case-insensitive (ILIKE) e acentos-insensitive se viável com a collation padrão do Postgres (não quebrar se não for)
  - [ ] As duas buscas rodam em paralelo (`Promise.all`) para manter latência baixa
  - [ ] Sem filtros adicionais — esse endpoint é só para o campo "buscar geral"; filtros vivem em `BE-07` / `BE-10`

  **Files:**
  - `src/http/controllers/admin/search.ts` *(novo)*
  - `src/http/use-cases/admin/search.ts` *(novo)*
  - `src/http/use-cases/admin/search.spec.ts` *(novo)*
  - `src/http/repositories/athlete-profile-repository.ts` — adicionar `searchByTerm(term, limit)`
  - `src/http/repositories/match-repository.ts` — adicionar `searchByTerm(term, limit)`
  - `src/http/routes.ts`

  **Depends on:** `BE-03`, `BE-07` (reaproveita `AthleteProfileRepository`), `BE-10` (reaproveita `MatchRepository`)

  **Files:**
  - `src/setup/admin.ts`
  - `src/setup/admin.spec.ts` *(novo)*

  **Depends on:** `BE-02`
