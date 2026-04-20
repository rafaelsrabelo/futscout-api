# Architecture Rules

This document defines the mandatory architectural rules for the Futscout API project.

These are not style preferences. They are implementation constraints that AI agents must follow when proposing, generating, or refactoring code.

---

# Primary Architecture

This project is a **single Fastify 5 HTTP API** backed by PostgreSQL via Prisma.

Agents must preserve this architecture. Do not redesign the project into:

- microservices
- a separate admin backend
- NestJS-style modules
- Express-style middleware chains
- a gateway + backend split
- a GraphQL server

Unless explicitly requested.

---

# Source of Truth

Before making architectural decisions, agents must consult:

    CLAUDE.md
    README.md
    ai/context/project-context.md
    prisma/schema.prisma

If a generated solution conflicts with these documents, the documents win.

---

# Project Structure

The project follows a predictable layout.

    src/
        @types/              — ambient TypeScript augmentations (e.g. fastify-jwt.d.ts)
        env/                 — Zod-validated env loader
        http/
            controllers/     — async function controllers, one per endpoint
                billing/     — Stripe-related controllers grouped in a subfolder
            middlewares/     — verifyJwt, checkUsage
            repositories/    — repository interfaces (+ prisma/ and in-memory/)
                prisma/      — PrismaX repositories (production)
                in-memory/   — InMemoryX repositories (tests)
            use-cases/       — business logic classes, with *.spec.ts co-located
                errors/      — typed domain errors
            utils/           — HTTP-adjacent helpers
            routes.ts        — the single routing surface
        lib/                 — integrations (prisma, stripe, cloudflare-r2, openai, email, social-auth)
        setup/               — startup tasks (seedPlans)
        utils/               — pure helpers (validateCpf)
        app.ts               — Fastify app, plugins, global error handler
        server.ts            — seedPlans() then app.listen

    prisma/
        schema.prisma        — authoritative domain model
        migrations/          — append-only SQL migrations
        seed.ts              — dev seed

    scripts/                 — one-shot maintenance scripts (Stripe sync, imports)
    data/                    — CSV inputs for import scripts
    docs/                    — PT-BR domain docs

---

# Routing Rule

All routes must be registered in **one place**: `src/http/routes.ts`, inside the `appRoutes(app)` async function.

- `app.register(appRoutes, { prefix: '/api' })` is the only route registration in `src/app.ts`.
- Controllers must never self-register. They export an async function that `routes.ts` imports.
- Auth is applied per-route via `{ onRequest: [verifyJwt] }`. Usage-limited routes add `checkUsage`: `{ onRequest: [verifyJwt, checkUsage] }`.
- Admin-only routes must add an explicit role check — either a new `verifyAdmin` middleware or an in-controller `if (request.user.role !== 'ADMIN') return reply.status(403)...`.

Agents must not introduce:

- Fastify route autoloaders
- plugin-based route modules (`app.register(myRoutes)` spread across files)
- runtime route generation from decorators

---

# Layered Responsibility

The application follows a strict three-layer model:

    HTTP Request
        ↓
    Middleware (verifyJwt, checkUsage)
        ↓
    Controller (Zod parse, instantiate deps, call use case, map errors to HTTP)
        ↓
    Use Case (business logic, guard clauses, typed errors)
        ↓
    Repository (Prisma calls, no business logic)
        ↓
    PostgreSQL

Data flows back up the same chain. Each layer depends only on the layer directly below it.

Agents must not skip layers. Specifically:

- controllers must not call Prisma directly — they must go through a repository
- use cases must not import Fastify types (`FastifyRequest`, `FastifyReply`)
- repositories must not throw typed domain errors — they return `null` or raw Prisma data, and the use case decides what to throw

---

# Controller Rule

Controllers live in `src/http/controllers/` as flat async functions, one per endpoint.

Responsibilities:

- parse input with Zod
- extract `request.user.sub` / `request.user.role`
- instantiate the concrete Prisma repositories
- construct the use case with those repositories
- call `useCase.execute(params)`
- map typed use-case errors to HTTP responses
- return `reply.status(n).send(body)`

Controllers must not:

- contain business rules
- call Prisma directly
- perform cross-entity transactions in-line (move those into the use case with a Prisma `$transaction`)
- catch `ZodError` manually (let `app.setErrorHandler` handle it globally)

---

# Use Case Rule

Use cases live in `src/http/use-cases/` as classes.

Responsibilities:

- accept dependencies via constructor (repositories, and occasionally `src/lib/*` integrations)
- expose a single `execute(params): Promise<response>` method
- enforce business rules
- throw typed errors from `src/http/use-cases/errors/`

Use cases must not:

- import from `fastify`
- read env variables directly (pass them as dependencies or use `@/env/index.js` only when genuinely needed)
- know about HTTP status codes
- reference route paths

Tests (`*.spec.ts`) live next to the use case and exercise it with in-memory repositories.

---

# Repository Rule

Repositories live in `src/http/repositories/`:

    src/http/repositories/<name>-repository.ts       — interface
    src/http/repositories/prisma/prisma-<name>-repository.ts
    src/http/repositories/in-memory/in-memory-<name>-repository.ts

Both implementations must implement the interface. Tests import only the in-memory version.

Repositories must:

- expose narrow, persistence-focused methods
- return Prisma model types (imported from `generated/prisma/client.js`)
- return `null` (or an empty array) for missing records — never throw domain errors
- stay free of business rules

Repositories must not:

- validate input (that's the controller's job)
- enforce authorization rules (that's the use case's job, using the userId in the method signature)
- throw typed domain errors

---

# Error Handling Rule

There are three tiers of error handling:

1. **Validation errors (Zod)** — thrown by `schema.parse()` inside the controller, caught globally by `app.setErrorHandler` in `src/app.ts` → `400 Validation error`.
2. **Typed domain errors** — thrown by use cases, defined in `src/http/use-cases/errors/`. Caught either in the controller's `try/catch` (preferred for endpoint-specific errors) or in `app.setErrorHandler` (for cross-cutting errors like `AthleteProfileNotFoundError`, `MatchNotFoundError`).
3. **Unhandled errors** — caught by `app.setErrorHandler`, logged via `console.error`, returned as `500 Internal server error` (with stack trace only when `NODE_ENV !== 'production'`).

Agents must not:

- return raw `Error.message` strings to the client
- expose Prisma error codes (`P2002`, etc.) — translate them to typed domain errors
- swallow errors silently

---

# Middleware Rule

Middlewares live in `src/http/middlewares/` and are plain async Fastify hooks `(request, reply) => { ... }`.

Current middlewares:

- `verifyJwt` — validates JWT via `@fastify/jwt` and checks token blacklist
- `checkUsage` — checks the user's plan against monthly usage counters

When adding a new middleware:

- it must be registered per-route via the `onRequest` option, not globally
- it may read/write `request.user` but must not mutate unrelated request state
- it must reply and `return` on failure (do not `throw` from a middleware unless you want the global error handler to take over)

---

# Validation Responsibility Boundary

Validation happens **inside the controller** with Zod. The use case trusts its inputs.

Exception: invariants that can only be checked after a database read (e.g. "user exists", "match belongs to athlete") are enforced in the use case via guard clauses and typed errors.

Agents must not:

- scatter Zod schemas across multiple files
- move validation into a middleware unless the validation rule is truly cross-cutting

---

# Authentication Responsibility Boundary

Authentication is enforced at the route boundary via `{ onRequest: [verifyJwt] }`.

`verifyJwt` attaches the JWT payload to `request.user` (`sub`, `role`) via the `@fastify/jwt` augmentation in `src/@types/fastify-jwt.d.ts`.

The authentication mechanism is JWT access + refresh token + blacklist. Do not introduce alternative schemes (session cookies, OAuth-style opaque tokens, API keys) without explicit approval.

---

# Authorization Responsibility Boundary

Authorization lives in use cases, not middlewares. The use case receives `userId` (and `role` when needed) and enforces ownership checks such as "this match belongs to this athlete". Failures throw typed errors like `MatchNotBelongsToAthleteError` → `403`.

The one exception is the **admin gate**: `request.user.role === 'ADMIN'`. This is a route-level concern and may be checked at the top of the controller (or via a dedicated `verifyAdmin` middleware) before the use case runs.

---

# Transaction Rule

When a use case performs multiple writes that must succeed or fail together, wrap them in a Prisma `$transaction`. The transaction is the use case's responsibility.

Do not expose `prisma.$transaction` at the repository level — instead, have the repository expose helper methods that accept an optional transaction client if truly necessary.

---

# Startup Rule

`src/server.ts` must:

1. Call `seedPlans()` before `app.listen` — this ensures the FREE and PREMIUM plans exist, which `checkUsage` depends on.
2. Call `app.listen({ host: '0.0.0.0', port: env.PORT })`.

Agents must not add arbitrary startup tasks. New startup tasks go in `src/setup/<name>.ts` and are chained explicitly in `server.ts`.

---

# Stripe Webhook Rule

The Stripe webhook route (`POST /api/billing/webhook`) is architecturally special:

- it sets `config.rawBody = true` so Fastify preserves the raw body for signature verification
- it has no JWT guard — authentication is via the `Stripe-Signature` header, verified inside the controller using `STRIPE_WEBHOOK_SECRET`
- it has a smaller `bodyLimit` (1 MB)

Agents must not:

- add JSON body parsing middleware that would consume the raw body
- move webhook handling to a different route prefix
- add JWT auth to the webhook

---

# R2 Upload Rule

Large file uploads (videos, photos) follow the **presigned URL pattern**:

1. client calls `GET /api/videos/upload-url` → receives a presigned URL
2. client uploads the file directly to Cloudflare R2
3. client calls `PUT /api/plays/:playId/video-url` (or equivalent) with the final URL

Server-side upload endpoints (`POST /api/plays/:playId/video`, `POST /api/athletes/profile/photo`, `POST /api/observer/profile/photo`) exist for legacy compatibility and small files, but new endpoints should default to presigned URLs.

Agents must not stream large files through the Fastify process without a clear reason.

---

# Simplicity Rule

Architecture must remain focused. Agents must avoid introducing complexity that the project does not require.

Avoid:

- premature abstraction frameworks
- unnecessary indirection
- deep inheritance structures
- speculative architecture

---

# Security Boundary Rule

Server-only logic must never leak secrets back to the client:

- JWT secret, refresh tokens, Stripe secret key, Cloudflare R2 credentials, SMTP password, OpenAI key — all server-only
- API responses must return only fields intended for the client
- Prisma models that contain sensitive fields (e.g. `User.password`) must be mapped to a safe response shape before being sent

See `ai/rules/security.md` for the full policy.

---

# Final Rule

When in doubt, choose the architecture that is:

- closest to the current project shape
- simplest for the admin workstream
- safest by default
- easiest for another engineer to review

Read two or three existing endpoints and match their structure.
