# File Naming Conventions

This document defines the file naming conventions that must be followed in the Futscout API repository.

AI agents must always follow these conventions when creating new files.

File naming must remain consistent across the entire project.

---

# General Rule

All source files under `src/` use **kebab-case** with the `.ts` extension.

Correct:

    create-athlete-profile.ts
    prisma-users-repository.ts
    in-memory-athlete-profile-repository.ts
    verify-jwt.ts
    validate-cpf.ts

Incorrect:

    createAthleteProfile.ts
    CreateAthleteProfile.ts
    prisma_users_repository.ts
    PrismaUsersRepository.ts

File names must clearly communicate the file's responsibility.

---

# Naming Style

File names must:

- use lowercase
- use hyphen-separated words
- avoid camelCase
- avoid PascalCase
- avoid underscores

One legacy inconsistency exists: `src/utils/validateCpf.ts` and `src/utils/validateCpf.spec.ts` use camelCase. Do **not** imitate this — new files must follow kebab-case.

---

# Controllers

Controllers live inside:

    src/http/controllers/
    src/http/controllers/billing/      — billing-related controllers grouped here

Each controller file contains exactly one exported async function whose name matches the file in camelCase:

    src/http/controllers/create-athlete-profile.ts          → export async function createAthleteProfile(...)
    src/http/controllers/list-my-matches.ts                 → export async function listMyMatches(...)
    src/http/controllers/billing/get-subscription.ts        → export async function getSubscription(...)

One controller per file. No re-exports. No default exports.

---

# Use Cases

Use cases live inside:

    src/http/use-cases/

Each use case file exports a single class whose name is the PascalCase equivalent of the file name plus the `UseCase` suffix:

    src/http/use-cases/authenticate.ts                → export class AuthenticateUseCase
    src/http/use-cases/create-athlete-profile.ts      → export class CreateAthleteProfileUseCase
    src/http/use-cases/edit-athlete-profile.ts        → export class EditAthleteProfileUseCase

No `.usecase.ts` suffix in the file name — plain kebab-case only.

---

# Use Case Errors

Typed domain errors live inside:

    src/http/use-cases/errors/

One error class per file. File name ends in `-error.ts`:

    invalid-credentials-error.ts     → export class InvalidCredentialsError
    email-already-exists-error.ts    → export class EmailAlreadyExistsError
    invalid-cpf-error.ts             → export class InvalidCpfError

Do not aggregate multiple errors into a single file.

Note: a few legacy use cases (e.g. `create-match.ts`, `get-match.ts`, `update-competition.ts`) declare their error classes inline alongside the use case. When **adding new** error classes, always use a dedicated file under `errors/`.

---

# Repositories

Each repository has three files:

    src/http/repositories/<name>-repository.ts                        — interface
    src/http/repositories/prisma/prisma-<name>-repository.ts          — Prisma impl
    src/http/repositories/in-memory/in-memory-<name>-repository.ts    — in-memory impl

Class names:

    users-repository.ts                     → export interface UsersRepository
    prisma/prisma-users-repository.ts       → export class PrismaUsersRepository implements UsersRepository
    in-memory/in-memory-users-repository.ts → export class InMemoryUsersRepository implements UsersRepository

Note: an existing file is `src/http/repositories/in-memory/in-merory-users-repository.ts` — this is a typo. Do not create new files with this typo. When touching that file, consider fixing the name in a dedicated rename commit (with a follow-up on all imports).

---

# Middlewares

Middlewares live inside:

    src/http/middlewares/

File name matches the exported function name in kebab-case:

    verify-jwt.ts      → export async function verifyJwt(...)
    check-usage.ts     → export async function checkUsage(...)

---

# Tests

Test files use the `.spec.ts` suffix and live **co-located** next to the source file they test. There is no separate `tests/` directory.

    src/http/use-cases/authenticate.ts
    src/http/use-cases/authenticate.spec.ts

    src/http/use-cases/create-athlete-profile.ts
    src/http/use-cases/create-athlete-profile.spec.ts

    src/lib/verification-code.ts
    src/lib/verification-code.spec.ts

    src/http/repositories/in-memory/in-memory-verification-code-repository.ts
    src/http/repositories/in-memory/in-memory-verification-code-repository.spec.ts

Integration tests (if any are added) may use `.int.spec.ts`. E2E tests (if added) may use `.e2e.spec.ts`. For now the codebase only uses plain `.spec.ts` unit tests against in-memory repositories.

Do not place tests under a separate `tests/` folder — the co-location convention is established and enforced.

---

# Library Modules

Integrations and shared library modules live inside:

    src/lib/

Each file represents one integration or library:

    src/lib/prisma.ts              — Prisma client singleton
    src/lib/stripe.ts              — Stripe client
    src/lib/cloudflare-r2.ts       — R2 S3-compatible client
    src/lib/email.ts               — nodemailer setup
    src/lib/openai.ts              — OpenAI client
    src/lib/social-auth.ts         — Google / Apple token verification
    src/lib/video-compression.ts   — ffmpeg wrapper
    src/lib/video-thumbnail.ts     — ffmpeg thumbnail extraction
    src/lib/verification-code.ts   — email verification code generator

File names are kebab-case; there is no `.lib.ts` or `.service.ts` suffix.

---

# Utilities

HTTP-adjacent helpers that depend on the request context live in:

    src/http/utils/

    athlete-list-helpers.ts
    check-premium.ts
    increment-usage.ts
    sync-current-club.ts

Pure helpers (no Fastify, no Prisma) live in:

    src/utils/

    validateCpf.ts                 — legacy camelCase; new files must use kebab-case

---

# Setup Files

Startup tasks live in:

    src/setup/

    plans.ts                       — exports seedPlans()

New startup tasks should be kebab-case and exported as named functions.

---

# Controller Subfolders

A controller subfolder is created when a group of endpoints shares a cross-cutting concern. Currently this exists only for billing:

    src/http/controllers/billing/
        check-price-id-match.ts
        checkout.ts
        get-stripe-config.ts
        get-subscription.ts
        list-plans.ts
        portal.ts
        webhook.ts

When adding **admin** endpoints, create `src/http/controllers/admin/` and group them consistently. Use cases and repositories for admin-only logic likewise go under `src/http/use-cases/admin/` and `src/http/repositories/*admin*-repository.ts` (or share existing repositories when the domain model is the same).

---

# Script Files

One-shot maintenance scripts live in:

    scripts/

File names are kebab-case `.ts` (preferred) or `.js` / `.sh`. Example:

    importar-atletas.ts
    normalizar-nomes-atletas.ts
    verificar-ambiente-stripe.ts

PT-BR verbs are acceptable here because scripts are operational, not library code. Keep the pattern when adding new scripts in this folder.

---

# Migration Files

Prisma migrations live in:

    prisma/migrations/<timestamp>_<description>/migration.sql

These file names are generated by `npx prisma migrate dev --name <description>`. AI agents must never hand-write migration folder names.

---

# Type Augmentation Files

Ambient TypeScript augmentations live in:

    src/@types/

    fastify-jwt.d.ts               — augments FastifyRequest.user with the JWT payload

Use the `.d.ts` extension only for true ambient declarations. Normal type definitions belong in regular `.ts` files (usually inside `src/http/use-cases/types.ts` for use-case request/response types).

---

# Consistency Rule

AI agents must always follow these naming conventions.

When in doubt, inspect two or three neighboring files in the target folder and match their pattern exactly — including any legacy oddities (like the `prisma-` prefix in `src/http/repositories/prisma/`).

Consistency across the entire project is mandatory.
