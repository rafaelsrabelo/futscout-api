# Security Rules

This document defines the mandatory security rules for the Futscout API.

Security is not optional. AI agents must treat these rules as non-negotiable when generating or modifying code.

---

# Security First Principle

Security must be considered from the first line of code.

Agents must assume that:

- user input is untrusted
- clients may be hostile
- public endpoints may be scraped and abused
- authenticated endpoints may be called by users impersonating other resources
- secrets must never leave the server
- plan limits may be targeted for evasion

The system must always default to the safest implementation.

---

# Authentication

This API uses a **JWT access token + refresh token + blacklist** scheme. Agents must not introduce alternative authentication mechanisms unless explicitly requested.

Rules:

- access tokens are signed with `JWT_SECRET` via `@fastify/jwt` (short TTL, `env.JWT_EXPIRES_IN` defaults to `15m`)
- refresh tokens are random strings persisted in the `RefreshToken` table with an explicit `expiresAt`
- logout writes the access token to the `TokenBlacklist` table; `verifyJwt` checks the blacklist on every protected request
- every protected route must declare `{ onRequest: [verifyJwt] }` — no exceptions
- public routes are limited to: authentication endpoints (`/api/auth/*`), the public athlete discovery endpoints (`/api/public/athletes`, `/api/public/athletes/:id`), `/api/billing/stripe-config`, `/api/billing/plans`, `/api/billing/check-price-id-match`, `/api/billing/webhook`, and the health checks (`/`, `/api/health`)
- admin-only routes require `request.user.role === 'ADMIN'` in addition to `verifyJwt` (either inline in the controller or via a dedicated middleware)

Credentials accepted by the `POST /api/auth/sessions` endpoint are email **or** CPF. CPFs are normalized to 11-digit numeric strings — reuse `normalizeCpf` rather than re-implementing it.

---

# Authorization

Authentication does not imply authorization.

Every write or read endpoint that touches user-scoped data must verify that `request.user.sub` actually owns the resource being accessed:

- match endpoints must check match.athleteProfile.userId === request.user.sub (via the use case)
- play endpoints must verify the parent match's ownership
- team endpoints must verify the team's athlete ownership
- achievement, competition, team-history endpoints likewise

Ownership checks live in use cases and throw typed errors (e.g. `MatchNotBelongsToAthleteError`, `CompetitionNotBelongsToAthleteError`) that map to HTTP `403`.

Role checks (e.g. admin-only) live at the controller boundary and return `403` directly.

---

# Input Validation

All external input must be validated with **Zod** at the HTTP boundary:

- `request.body`
- `request.query`
- `request.params`
- uploaded file metadata (filename, mime type, size)
- webhook payloads (via Stripe signature verification, not just Zod)

Validation schemas are declared inline in controllers. `schema.parse()` throws `ZodError`, which `app.setErrorHandler` in `src/app.ts` translates to a 400 response with structured `issues`.

Agents must not:

- trust unvalidated input in controllers or use cases
- parse JSON manually before Zod
- skip validation "because the frontend already validates"

---

# Plan Enforcement (checkUsage)

The `checkUsage` middleware enforces monthly plan limits on countable endpoints (match creation, play creation, video uploads). Rules:

- every new route that creates a countable resource must include `{ onRequest: [verifyJwt, checkUsage] }`
- usage counters are incremented by the controller via `src/http/utils/increment-usage.ts` **after** the resource is successfully created — never before
- the FREE plan limits (`monthlyLimitMatches`, `monthlyLimitVideos`, `monthlyLimitStandaloneVideos`) are seeded by `seedPlans()` and enforced by `checkUsage`
- limit blocks currently live commented-out in `check-usage.ts` (temporarily disabled). When re-enabling, reinstate them — do not delete the commented code until the decision is final

Agents must not:

- let an endpoint that creates a countable resource skip `checkUsage`
- increment usage counters speculatively before the resource is persisted
- expose plan names or limits to unauthenticated clients beyond what `GET /api/billing/plans` already returns

---

# Password Storage

Passwords are hashed with **bcryptjs**:

- `hash(password, 6)` on registration
- `compare(password, user.password)` on authentication
- password complexity rules (from `README.md`) are enforced in the register controller via Zod

Agents must not:

- weaken the bcrypt cost factor
- introduce an alternative hashing library (argon2, scrypt) without explicit approval
- log passwords anywhere
- return the `password` field in API responses — always omit or map to a safe DTO

---

# Token Blacklist

On logout, the current access token is written to the `TokenBlacklist` table. `verifyJwt` checks this on every protected request.

Agents must not:

- bypass the blacklist check
- truncate the blacklist without an explicit scheduled task (blacklist cleanup by `expiresAt` is a legitimate future task)
- introduce "impersonate" endpoints that issue new tokens without going through the same blacklist discipline

---

# Stripe Webhook

The Stripe webhook is a privileged, unauthenticated (from the JWT perspective) endpoint. Its security relies on:

- Stripe signature verification inside the controller, using `STRIPE_WEBHOOK_SECRET`
- the raw request body (configured via `config.rawBody = true` on the route)
- a smaller body limit (1 MB) to reduce attack surface

Agents must not:

- add global JSON body parsing that would consume the raw body
- disable signature verification
- log the webhook body (it may contain sensitive customer metadata)
- treat webhook payloads as trusted before verification completes

---

# Cloudflare R2

R2 credentials (`CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`) are server-only.

Presigned URLs returned to clients:

- must be scoped to a specific object key
- must have a bounded TTL (as configured in `src/lib/cloudflare-r2.ts`)
- must be generated only after `verifyJwt` has authorized the request
- must not be logged

When deleting domain rows that reference R2 objects (plays, profile photos, thumbnails), always delete the R2 object too — leaking binary objects is both a cost and a privacy issue.

---

# SMTP / Email

Email goes through `src/lib/email.ts` (nodemailer). Credentials (`SMTP_USER`, `SMTP_PASS`) are server-only.

Agents must not:

- include raw user input in email subject lines or bodies without sanitization
- render untrusted HTML without escaping
- send emails from controllers — email triggers live in use cases

---

# OpenAI

`OPENAI_API_KEY` is server-only.

Prompts are constructed server-side (`src/http/use-cases/generate-ai-scout.ts`, `generate-scout-by-position.ts`, etc.). User input that feeds into prompts must be sanitized (trimmed, length-bounded) before being concatenated into a system/user message.

Agents must assume prompt injection is possible. Do not return raw LLM output to the client without mapping it to the expected schema.

---

# Environment Variables

All env vars are validated by Zod in `src/env/index.ts` at module load. Required vars:

- `JWT_SECRET`
- `DATABASE_URL`

A missing or malformed required var crashes the process at startup by design.

Agents must not:

- access `process.env.*` directly in application code (always go through `@/env/index.js`)
- weaken the schema to accept missing required vars
- commit `.env` or `.env.local` to the repository

---

# Output Sanitization

Responses sent to the client must not expose:

- `User.password` (always map to a safe DTO)
- `RefreshToken.token` values other than to the user who just authenticated
- Stripe customer IDs or price IDs to users who don't own them
- raw Prisma errors (`P2002`, etc.) — translate to typed domain errors
- stack traces (enabled only when `NODE_ENV !== 'production'` in `app.setErrorHandler`)

When adding a new endpoint that returns a domain entity, inspect the Prisma model's fields and confirm every returned field is safe to expose.

---

# Error Handling

Error messages returned to the client must be safe:

- validation errors → `400` with Zod `issues` (safe — Zod returns input paths, not data)
- authentication errors → generic "Invalid credentials" (do not reveal whether the email or CPF exists)
- authorization errors → generic "Access denied"
- missing resources → generic "Not found"
- unhandled errors → `500 Internal server error` (stack trace only in non-production)

Detailed errors are logged server-side via `console.error` (currently) or Fastify's built-in logger.

Agents must not:

- leak Prisma error messages
- leak Stripe error payloads verbatim
- expose internal IDs that let a caller enumerate resources they don't own

---

# Logging Safety

Logs must not include:

- JWT access tokens or refresh tokens
- passwords (hashed or plaintext)
- bcrypt hashes
- Stripe secret keys or webhook secrets
- R2 access keys
- OpenAI API key
- SMTP credentials
- CPFs in full (prefer masking last digits)

Be careful when logging request bodies — they may contain any of the above.

---

# Rate Limiting

Rate limiting at the HTTP level is not currently implemented in this codebase, despite being listed in `README.md` as a non-functional requirement. When adding rate limiting:

- prefer `@fastify/rate-limit` over a custom implementation
- apply per-route limits on authentication endpoints (5 attempts / 15 min per IP is the target from README)
- apply broader limits on other endpoints (100 req / 15 min per IP target)
- do not introduce application-level rate limiting that bypasses Fastify hooks

Until rate limiting is added, login controllers must remain cheap enough to tolerate occasional brute-force attempts (bcrypt cost factor 6 already adds friction).

---

# Dependency Safety

Agents must avoid introducing dependencies that:

- execute remote code at install time
- have known security vulnerabilities
- access filesystem or network unnecessarily
- duplicate functionality already available in existing dependencies

Prefer well-known, widely used libraries. When in doubt, ask the human before adding a dependency.

---

# Default Security Behavior

When uncertain about a decision, agents must choose the option that:

- exposes less data
- requires stronger validation
- keeps logic server-side
- limits access scope
- logs less sensitive information

Security must always take precedence over convenience.

---

# Final Rule

Security violations are considered critical issues.

Agents must always review generated code for:

- secret exposure (env vars, tokens, keys in responses or logs)
- unsafe data access (missing ownership checks, skipped `verifyJwt`)
- missing validation
- incorrect authorization
- raw body consumption on the Stripe webhook

If a change introduces security risk, the agent must refuse or correct the implementation before submitting.
