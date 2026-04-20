# AI Behavior Rules

This document defines how AI agents must behave when working inside the Futscout API repository.

These rules are designed to ensure that AI assistance remains safe, predictable, and aligned with the existing architecture.

Agents must follow these behavioral rules before generating code, modifying files, or proposing solutions.

---

# Consult Project Documents First

Before implementing or suggesting solutions, agents must consult:

    CLAUDE.md
    README.md
    prisma/schema.prisma
    ai/context/project-context.md
    ai/rules/architecture.md

These documents define:

- the product scope
- the real technology stack (Fastify 5, Prisma, Vitest, Stripe, R2)
- the domain model already in place
- the admin workstream scope

Agents must not invent features, tables, or integrations outside what is defined in these documents.

If something is unclear, the agent should request clarification rather than guessing.

---

# Respect the Project Scope

This repository is a **backend-only HTTP API**.

Agents must prioritize:

- simplicity
- alignment with the existing Controller → Use Case → Repository flow
- reuse of existing Prisma models, enums, and middlewares
- consistency with the PT-BR / EN language split

Agents must not introduce features outside scope such as:

- a React admin dashboard in this repo
- a second auth mechanism alongside JWT + refresh token
- a background job framework (BullMQ, agenda, temporal)
- an in-process message bus
- new persistence systems (MongoDB, Redis, DynamoDB)
- a GraphQL layer
- API gateways or BFFs

If such features are requested explicitly by the user, they may be implemented. Otherwise they must not be introduced.

---

# Do Not Invent Architecture

Agents must not introduce architectural patterns that do not exist in this project.

Examples of forbidden architectural invention here:

- NestJS modules, providers, or decorators
- Express `app.use(router)` style routing (the project uses Fastify `app.register`)
- TypeORM entities, decorators, or repositories
- base-class inheritance scaffolding (`BaseRepository`, `BaseUseCase`, `BaseController`)
- dependency injection containers (tsyringe, inversify)
- factory patterns for repositories
- event-driven pipelines or CQRS
- domain events or aggregates borrowed from DDD tactical patterns

Architecture must always match the current stack:

- Fastify 5 with `onRequest` hooks (`verifyJwt`, `checkUsage`)
- Controller functions → Use Case classes → Repository interfaces
- Prisma for persistence, Zod for validation, Vitest for tests

---

# Respect Existing Patterns

Before generating new code, agents must inspect at least two neighboring files and match:

- naming conventions (kebab-case files, PascalCase classes)
- folder placement (`src/http/controllers/`, `src/http/use-cases/`, `src/http/repositories/`)
- import style (`.js` extensions on relative imports, alias `@/` only for `src/env` and `src/lib`)
- Zod schema placement (inline inside the controller)
- error class placement (`src/http/use-cases/errors/`)
- repository interface pattern (interface in `src/http/repositories/*-repository.ts`, Prisma impl and in-memory impl both implementing it)

Consistency with the existing codebase is mandatory.

---

# Prefer Simpler Solutions

When multiple solutions exist, agents must prefer the one that is:

- simpler
- easier to understand
- easier to maintain
- consistent with the surrounding code

Avoid complex abstractions unless they clearly improve the design.

Three similar use cases is preferable to a premature generic one.

---

# Avoid Overengineering

Agents must not introduce complexity that the project does not require.

Avoid:

- generic framework abstractions
- deep inheritance structures
- speculative scalability features
- factories for single-implementation classes
- dependency injection frameworks
- middleware pipelines that wrap a single call
- custom decorators

The project favors explicit code over architectural cleverness.

---

# Reuse Before Creating

Before generating a new module, agents should check whether similar logic already exists.

Canonical places to check:

- `src/http/utils/` for HTTP-adjacent helpers (e.g. `check-premium.ts`, `increment-usage.ts`, `athlete-list-helpers.ts`)
- `src/utils/` for pure helpers (e.g. `validateCpf.ts`)
- `src/lib/` for integrations (Prisma, Stripe, R2, email, OpenAI, social auth)
- `src/http/repositories/` for existing repository methods that can be extended

If reusable logic already exists, agents should reuse it rather than duplicating behavior. Reuse must remain reasonable — do not create artificial abstraction layers only to satisfy theoretical reuse.

---

# Thin Entry Points

Agents must ensure that:

- controllers (`src/http/controllers/*.ts`) remain focused on request parsing, use case invocation, and HTTP response shaping
- middlewares (`src/http/middlewares/*.ts`) remain focused on cross-cutting authentication/authorization/usage checks
- `src/app.ts` remains focused on plugin registration and the global error handler
- `src/server.ts` remains focused on `seedPlans()` and `app.listen`

Business logic must live in use cases. Persistence must live in repositories.

---

# Avoid Unsafe Changes

Agents must not modify the following without an explicit user request:

- `src/env/index.ts` env var schema
- `src/app.ts` plugin registration order (multipart before JWT before routes)
- `src/http/middlewares/verify-jwt.ts` authentication behavior
- `src/http/middlewares/check-usage.ts` plan enforcement logic
- existing Prisma migrations under `prisma/migrations/` (these are append-only)
- the Stripe webhook `rawBody` configuration

Changes to any of these require explicit approval and a clear understanding of the blast radius.

---

# Database Migrations

Agents must not generate Prisma migrations automatically.

- Migrations are created by the human via `npx prisma migrate dev --name <desc>`
- AI may assist with schema changes in `prisma/schema.prisma`
- AI may describe what the migration will contain
- But the actual SQL file under `prisma/migrations/` must be produced by the Prisma CLI driven by a human

Never hand-edit a migration SQL file that has already been applied.

---

# Secrets

Agents must never expose:

- the contents of `.env`
- JWT secrets
- Stripe keys (publishable, secret, or webhook)
- Cloudflare R2 access keys
- Google/Apple client secrets
- SMTP credentials
- OpenAI API key

If a generated solution risks exposing secrets (logging them, returning them in an API response, committing them in a fixture), the agent must refuse or correct it.

---

# Language Rule

Agents must preserve the PT-BR / EN split described in `ai/context/coding-style.md`:

- user-facing messages and validation errors in **PT-BR**
- identifiers, types, and ops logs in **EN**

Do not translate Portuguese domain terms to English inside identifiers (e.g. keep `createAthleteProfile`, not `criarPerfilAtleta`; keep `adversaryTeam`, not `timeAdversario`). Conversely, do not translate PT-BR user-facing strings to English.

---

# Ask When Uncertain

If a request conflicts with:

- architecture rules (`ai/rules/architecture.md`)
- security rules (`ai/rules/security.md`)
- the existing Prisma schema
- the admin-scope boundary described in `ai/context/project-context.md`

the agent should ask for clarification instead of guessing.

---

# Keep Code Review Friendly

Agents must generate code that is easy to review.

Good AI-generated code here:

- is readable line by line
- uses guard clauses, not nested `else` trees
- names variables and parameters explicitly
- does not mix unrelated changes in one diff
- matches the style of at least two surrounding files

Avoid clever tricks that reduce clarity.

---

# No Silent Architectural Changes

Agents must not introduce silent architectural shifts. Examples:

- moving business logic from a use case into a controller (or vice versa)
- moving persistence from a repository into a use case
- changing the repository interface pattern to expose Prisma models directly
- introducing new layers ("services" next to use cases, "handlers" next to controllers)

Such changes require explicit approval.

---

# Default Acceptance Criteria

In addition to any task-specific acceptance criteria, every task implicitly requires:

- `npm run build` passes (TypeScript compiles cleanly)
- `npm run lint` passes
- `npm run test` passes
- `npm run dev` starts without throwing
- No new ESLint or TypeScript errors are introduced
- No new `any` types (unless explicitly justified)
- Imports respect `ai/rules/import-rules.md` (`.js` extensions, Prisma from `generated/prisma/client.js`)

---

# Final Rule

AI assistance must behave like a disciplined senior engineer working inside an existing system.

Agents must prioritize:

- correctness
- security
- maintainability
- consistency with what is already in the repo

over creativity or novelty.
