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

  **Files:**
  - `src/setup/admin.ts`
  - `src/setup/admin.spec.ts` *(novo)*

  **Depends on:** `BE-02`
