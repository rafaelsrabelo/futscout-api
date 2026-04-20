# Layer Responsibilities

This document defines the responsibility boundaries for each layer of the Futscout API.

AI agents must respect these boundaries whenever creating, modifying, or refactoring code.

The goal is to keep the codebase predictable, testable, and aligned with the Controller → Use Case → Repository architecture.

---

# Core Principle

Each layer has a single, clearly defined responsibility.

Preferred flow:

    HTTP Request
        ↓
    Middleware (auth, usage)
        ↓
    Controller (validate + map HTTP)
        ↓
    Use Case (business logic)
        ↓
    Repository (persistence)
        ↓
    PostgreSQL / External service

When code starts mixing responsibilities, it must be split.

---

# Middlewares

Middlewares live inside:

    src/http/middlewares/

Current middlewares:

- `verifyJwt` — calls `request.jwtVerify()`, then checks the token blacklist
- `checkUsage` — reads the user's active subscription and monthly usage, blocks with `402` if over limit

Middleware responsibilities:

- authenticate the request (verifyJwt)
- authorize broad categories (role checks — e.g. a future `verifyAdmin`)
- enforce plan / rate limits (checkUsage)
- short-circuit with `reply.status(n).send(...)` on failure

Middlewares must not:

- parse or validate request bodies (that's the controller)
- load domain entities beyond what's needed for the check
- contain business rules (e.g. "an athlete must have at least one team" — that belongs in the use case)
- write to the database (usage **counters** are incremented by the controller via `src/http/utils/increment-usage.ts`, not by the middleware)

---

# Controllers

Controllers live inside:

    src/http/controllers/

Controller responsibilities:

- parse and validate the request body / params / query with Zod
- read `request.user.sub` and `request.user.role`
- instantiate the concrete Prisma repositories
- construct the use case with those repositories
- invoke `useCase.execute(params)`
- catch typed domain errors thrown by the use case and map them to HTTP status codes
- shape the response body and call `reply.status(n).send(body)`

Controllers must not contain:

- business rules
- Prisma queries (use a repository)
- cross-entity transaction logic (put `$transaction` inside the use case)
- blocking I/O unrelated to the request (no side-channel calls to Stripe or R2 unless the endpoint is explicitly about them)
- inline error constructors for cross-cutting errors — use the classes in `src/http/use-cases/errors/`

Controllers may contain:

- lightweight data normalization that is purely about HTTP shape (e.g. normalizing a CPF string, trimming an email) — see `normalizeCpf` and `resolveCredential` in `src/http/controllers/authenticate.ts`
- response DTO mapping (stripping sensitive fields before `reply.send`)

One controller per file. One endpoint per controller.

---

# Use Cases

Use cases live inside:

    src/http/use-cases/

Each use case is a class exposing a single `execute(params)` method.

Use case responsibilities:

- enforce business rules for exactly one application workflow
- coordinate one or more repositories and library integrations
- enforce ownership / authorization checks that depend on domain data (e.g. "this match belongs to this athlete")
- throw typed errors from `src/http/use-cases/errors/` when invariants fail

Use cases must not:

- import `'fastify'`
- reference HTTP status codes
- reference route paths or query strings
- contain UI / presentation concerns (there is no UI in this repo)
- call Prisma directly (they go through repositories)
- construct repositories internally (repositories come in through the constructor)

Use cases may:

- use library integrations from `src/lib/` directly (e.g. `bcrypt.compare`, `stripe.subscriptions.create`, `r2.deleteObject`) — these are not "persistence" and don't need a repository wrapper
- open a Prisma `$transaction` when multiple writes must be atomic

---

# Repositories

Repositories live inside:

    src/http/repositories/<name>-repository.ts                        — interface
    src/http/repositories/prisma/prisma-<name>-repository.ts          — Prisma impl
    src/http/repositories/in-memory/in-memory-<name>-repository.ts    — in-memory impl

Repository responsibilities:

- expose narrow, persistence-focused methods (`findByEmail`, `create`, `update`, `delete`, `findManyByAthleteId`, etc.)
- translate Prisma queries into clear method signatures
- return Prisma model types from `generated/prisma/client.js`
- return `null` or empty arrays for missing data

Repositories must not contain:

- business rules ("only ATHLETE users can have an athlete profile" belongs in the use case)
- validation (that's the controller)
- authorization ("this user owns this match" belongs in the use case)
- HTTP concerns
- typed domain errors (they return `null`; the use case throws)
- Stripe calls, R2 calls, OpenAI calls — those are library integrations, not repositories

Every repository must have both a Prisma implementation and an in-memory implementation. The in-memory version is what unit tests use.

---

# Use Case Error Classes

Error classes live inside:

    src/http/use-cases/errors/

Each class extends `Error` and has a single constructor.

Responsibilities:

- carry a stable type that can be matched via `instanceof`
- carry an internal English message (for logs / debugging)

Error classes must not:

- carry HTTP status codes (the controller decides the status)
- carry user-facing PT-BR strings (the controller formats those)

---

# Library Integrations

Library integrations live inside:

    src/lib/

Files in `src/lib/` wrap external services and SDKs:

- `prisma.ts` — Prisma client singleton
- `stripe.ts` — Stripe client
- `cloudflare-r2.ts` — R2 S3-compatible client + helpers (presigned URLs, deletion)
- `email.ts` — nodemailer SMTP
- `openai.ts` — OpenAI client
- `social-auth.ts` — Google / Apple token verification
- `video-thumbnail.ts`, `video-compression.ts` — ffmpeg wrappers
- `verification-code.ts` — email verification code helper

Responsibilities:

- initialize SDK clients once
- expose narrow helper functions suited to this project's needs
- encapsulate SDK-specific quirks so callers don't need to know them

Library modules must not:

- contain domain business rules
- know about users, matches, plays, or any Futscout entity in a deep way (they can accept a userId or a key, but shouldn't make decisions about them)
- call Prisma

---

# HTTP Utilities

Cross-cutting helpers that depend on HTTP context live inside:

    src/http/utils/

- `check-premium.ts` — returns whether the authenticated user has an active premium plan
- `increment-usage.ts` — increments the `Usage` counters after a successful resource creation
- `sync-current-club.ts` — utility to sync an athlete's current club after team changes
- `athlete-list-helpers.ts` — shared list-filter helpers for listing athletes

Responsibilities:

- small reusable helpers that are too HTTP-flavored for `src/lib` but too shared to live inside a single controller

---

# Pure Utilities

Pure helpers (no Fastify, no Prisma, no external state) live inside:

    src/utils/

Currently:

- `validateCpf.ts` — CPF checksum validation

These must stay deterministic and side-effect-free.

---

# Setup Files

Startup tasks live inside:

    src/setup/

Currently:

- `plans.ts` — `seedPlans()` creates/updates FREE and PREMIUM plan rows at boot

Responsibilities:

- idempotent startup work that must complete before the HTTP server accepts requests

`server.ts` chains these tasks explicitly before `app.listen`. Do not add implicit startup work that hooks into the Fastify `onReady` event without an explicit review.

---

# Validation Responsibility Boundary

Validation happens **at the HTTP boundary** via Zod inside the controller.

- schemas are declared inline inside the controller function
- `schema.parse(request.body)` throws `ZodError`, caught globally by `app.setErrorHandler`
- error messages are written in PT-BR

Validation must not:

- live in a middleware (unless truly cross-cutting, which is rare)
- be duplicated in the use case (trust the parsed input)
- be scattered across multiple files

---

# Authentication Responsibility Boundary

Authentication lives at the route boundary via the `verifyJwt` middleware.

- `{ onRequest: [verifyJwt] }` is applied per-route in `src/http/routes.ts`
- `verifyJwt` attaches `request.user` (`{ sub, role }`) via the `@fastify/jwt` augmentation
- logout adds the access token to a blacklist checked on every protected request

Controllers and use cases must trust `request.user.sub` and `request.user.role` after `verifyJwt` has run.

---

# Authorization Responsibility Boundary

Two kinds of authorization exist:

1. **Role-level** (e.g. "admin-only route") — enforced at the top of the controller or via a dedicated `verifyAdmin` middleware.
2. **Ownership** (e.g. "this match belongs to this athlete") — enforced inside the use case via guard clauses that throw typed errors (`MatchNotBelongsToAthleteError`, `CompetitionNotBelongsToAthleteError`, etc.) mapped to `403`.

Authorization must not rely solely on the client — every write endpoint must verify ownership server-side.

---

# Calculation Responsibility Boundary

Domain calculations (match statistics, usage counts, plan limit comparisons) belong in:

- use cases (when they orchestrate one workflow)
- `src/http/utils/` (when they're reused across multiple endpoints)
- `src/lib/` (when they wrap an external calculation, e.g. thumbnail generation)

Calculations must not live in:

- controllers (beyond trivial shape adjustments)
- repositories (always persistence-focused)

---

# Email Responsibility Boundary

Email sending lives in `src/lib/email.ts` (nodemailer wrapper).

Email triggers belong in use cases. Controllers may invoke a use case that sends an email, but controllers must not call `transporter.sendMail` directly.

---

# Stripe Responsibility Boundary

Stripe interactions live in:

- `src/lib/stripe.ts` — the Stripe client
- `src/http/controllers/billing/*.ts` — controllers that proxy Stripe actions (checkout, portal, webhook)
- subscription persistence lives in the `Subscription` Prisma model via its repository

The Stripe webhook (`webhook.ts`) is the only controller that mutates `Subscription` rows based on external events. Do not replicate webhook handling in other places.

---

# R2 Responsibility Boundary

R2 interactions live in `src/lib/cloudflare-r2.ts`.

Upload patterns:

1. Presigned URL (preferred for videos) — controller returns a URL, client uploads directly, client PUTs the final URL back.
2. Direct server upload (legacy, small files) — controller reads the multipart stream and calls the R2 helper.

Controllers must not instantiate the S3 client themselves. Use cases must not instantiate the S3 client themselves. Always go through the wrapper.

When deleting domain rows that reference media (plays, profile photos), the use case must also delete the R2 object. Leaking R2 objects is a real cost issue.

---

# AI (OpenAI) Responsibility Boundary

OpenAI calls live in `src/lib/openai.ts` and `src/http/use-cases/generate-ai-scout.ts`.

AI is an **enhancement layer**:

- never required for core CRUD
- degrades gracefully when `OPENAI_API_KEY` is absent
- must not mutate domain data outside the scout record being generated

---

# Anti-Patterns

Agents must avoid these patterns:

- Prisma queries inside controllers
- Prisma queries inside middlewares (except for the narrow authentication/usage checks already in place)
- business rules inside repositories
- JWT verification inside controllers (use `verifyJwt`)
- typed error classes with embedded HTTP status codes
- use cases that receive Fastify types
- library integrations scattered across the codebase (always go through `src/lib/`)
- new startup work hidden in module-level side effects (use `src/setup/`)

These patterns make the architecture fragile and hard to test.

---

# When to Create a New Layer

A new service, use case, or helper should only be created when:

- the responsibility is clear
- the logic is reusable OR the alternative is a controller/use case that's growing too large
- the split improves clarity

Do not create layers only for the sake of abstraction.

---

# Final Rule

Every file must have one clear responsibility.

If a file starts mixing:

- validation
- persistence
- business rules
- HTTP response shaping
- external integrations

then the design is wrong and must be split.

Agents must always choose the structure with the clearest responsibility boundaries.
