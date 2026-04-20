# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                  # tsx watch src/server.ts (port 3333 default)
npm run build                # tsc (emits to ./dist)
npm run start                # tsx src/server.ts (production also runs via tsx, not compiled output)
npm run lint                 # eslint src --ext .ts
npm run lint:fix
npm run format               # prettier on src/**/*.ts

npm run test                 # vitest run (one-shot)
npm run test:watch
npm run test:coverage
npx vitest run path/to/file.spec.ts          # single file
npx vitest run -t "should authenticate"      # filter by test name

npm run db:setup             # ./setup-db.sh: docker-compose up + prisma migrate deploy + seed
npm run db:reset             # destroys volume and re-runs db:setup
npm run db:migrate:deploy    # prisma migrate deploy (prod/CI)
npm run db:seed              # tsx prisma/seed.ts
npm run studio               # prisma studio

# Data import scripts (order matters — atletas first, then partidas)
npm run db:import-atletas
npm run db:normalizar-nomes
npm run db:import-partidas
```

A new `prisma migrate dev` should be run manually (`npx prisma migrate dev --name <desc>`) — it isn't wrapped in an npm script.

## Architecture

Fastify 5 + TypeScript ESM API. Business logic is organized as **Controller → Use Case → Repository** (SOLID-ish, inspired by Rocketseat patterns).

### Request lifecycle

1. **`src/server.ts`** calls `seedPlans()` (idempotent — creates/updates FREE and PREMIUM plans) before `app.listen`. Never skip this: the `checkUsage` middleware and billing webhooks expect FREE/PREMIUM rows.
2. **`src/app.ts`** registers `@fastify/multipart` (100MB limit, 1 file/request), `@fastify/jwt`, the health check at `/`, and mounts `appRoutes` under **`/api`**. It also contains the centralized `setErrorHandler` — all use-case error classes must be caught here or in the controller.
3. **`src/http/routes.ts`** is the single routing surface. Every route lives here; controllers are never self-registering.
4. Controllers (`src/http/controllers/*.ts`) parse+validate with **Zod**, instantiate the Prisma repo(s), call the use case, and map domain errors to HTTP responses.
5. Use cases (`src/http/use-cases/*.ts`) are plain classes with constructor-injected repositories. They throw typed errors from `src/http/use-cases/errors/` (e.g. `InvalidCredentialsError`, `EmailAlreadyExistsError`).
6. Repositories come in two flavors with matching interfaces: `src/http/repositories/prisma/*` for production, `src/http/repositories/in-memory/*` for tests. Use cases depend on the interface in `src/http/repositories/*-repository.ts`.

### Testing pattern

Vitest specs are co-located (`*.spec.ts`) next to the use case. Tests instantiate the **in-memory repository** and the use case directly — no HTTP, no Prisma. See `src/http/use-cases/authenticate.spec.ts` for the canonical shape. When adding a use case, add the in-memory repo method too; otherwise the spec can't be written.

### Prisma client is generated to a custom path

`prisma/schema.prisma` sets `output = "../generated/prisma"`. Import Prisma types from `generated/prisma/client.js` (see `src/lib/prisma.ts`) — **do not** import from `@prisma/client`. After any schema change run `npx prisma generate` (or a migration) or the import will be stale.

### ESM + NodeNext import rules

- `"type": "module"` and `"module": "NodeNext"` — **all relative imports must include `.js`** (even when importing a `.ts` file). Existing code enforces this rigorously.
- Path alias `@/*` → `./src/*` is configured in `tsconfig.json` and resolved by `vite-tsconfig-paths` for tests. Prefer relative imports within `src/http/**`; `@/` is used for `src/env`, `src/lib`.

### Auth model

JWT access token (short, `JWT_EXPIRES_IN` default `15m`) + refresh token stored in DB (`REFRESH_TOKEN_EXPIRES_IN_DAYS` default 30). Logout writes the access token to `prisma-token-blacklist-repository`; the `verifyJwt` middleware checks the blacklist on every protected request. Social login (Google, Apple) goes through `src/lib/social-auth.ts`. Login accepts email **or** CPF — see `resolveCredential` in `controllers/authenticate.ts`.

### Plan-gated endpoints

Routes that create countable resources (matches, plays, video uploads) are guarded by `{ onRequest: [verifyJwt, checkUsage] }`. `checkUsage` reads the user's active `Subscription` → `Plan`, upserts the monthly `Usage` row, and returns **402 Payment Required** when limits are hit. Note: **limits are currently commented out** in `src/http/middlewares/check-usage.ts` — reinstate the blocks there when re-enabling enforcement. Usage counters are incremented by controllers via `src/http/utils/increment-usage.ts`.

### Billing (Stripe)

`POST /api/billing/webhook` needs the raw body — the route sets `config: { rawBody: true }`. Don't add JSON parsing middleware that would consume it. Webhook secret and price IDs come from env; `docs/ALINHAR-AMBIENTES-STRIPE.md` explains test/prod alignment. There's a large set of one-shot maintenance scripts in `scripts/` (customer sync, price updates, manual upserts) — read `scripts/README-SQL.md` before running any of them.

### Media storage

Uploads go to **Cloudflare R2** (S3-compatible) via `src/lib/cloudflare-r2.ts`. The preferred pattern is presigned URL → client uploads directly → client calls `PUT /plays/:playId/video-url` to attach. Server-side upload endpoints (e.g. `upload-video-to-play`) exist but bypassing them is cheaper. `video-thumbnail.ts` and `video-compression.ts` use `fluent-ffmpeg` (requires ffmpeg on PATH).

### Environment

`src/env/index.ts` parses `process.env` with Zod at module load — a missing required var (`JWT_SECRET`, `DATABASE_URL`) crashes the process immediately. `getDatabaseUrl()` selects `DATABASE_URL_TEST` / `DATABASE_URL_PROD` / `DATABASE_URL` based on `NODE_ENV` (`dev | test | production`).

### Language

Domain comments, error messages returned to the user, and docs in `docs/` are in **Portuguese**. Code identifiers are English. Keep this split when adding new features.
