# Coding Style Context

This document describes the preferred coding style used in the Futscout API repository.

It exists to help AI agents generate code that matches the style, structure, and architectural reality of this project.

Mandatory architectural restrictions are defined in:

    ai/rules/architecture.md

Other specific rules are defined in:

    ai/rules

---

# Project Reality Rule

This project is a **Node.js HTTP API** built with:

- Fastify 5
- TypeScript ESM (`"type": "module"`, `"module": "NodeNext"`)
- Prisma 6 with a custom generated client output at `generated/prisma/`
- Zod for validation
- Vitest for tests (with in-memory repository doubles)
- PostgreSQL via Docker for local development

Agents must generate code that fits this reality. Do **not** import conventions from Next.js, NestJS, Express, TypeORM, Supabase, or any other ecosystem that this project does not use.

Specifically:

- there is no React, no server actions, no App Router, no JSX anywhere in `src/`
- there is no Express app — route registration is Fastify-style (`app.register`, `onRequest` hooks)
- there is no dependency injection container — repositories are instantiated inline inside controllers
- there are no NestJS decorators, modules, or providers
- there is no GraphQL layer

---

# General Style

This codebase strongly prefers:

- explicit code
- small focused modules
- low coupling between controller, use-case, and repository
- clear responsibilities per layer
- predictable flow (parse input → call use-case → map result/error to HTTP)

Readability and maintainability are more important than brevity.

---

# Language Rule (PT-BR vs EN)

This is a hybrid-language codebase. The split is intentional and must be preserved.

**Portuguese (PT-BR):**
- domain comments and TODOs inside code
- error messages returned to the client (e.g. `'Nome é obrigatório'`, `'Você atingiu o limite mensal de partidas.'`)
- Zod validation messages
- documentation under `docs/`

**English:**
- all identifiers (file names, class names, variable names, method names, route paths)
- TypeScript types
- Prisma model and enum names
- log statements intended for ops (e.g. `console.error('Error starting server:', error)`)

Agents must not "translate" identifiers to Portuguese, and must not "translate" user-facing messages to English when extending existing features.

---

# Controller Style

Controllers are plain async functions (not classes). They are the only place that:

- parses input with Zod
- reads `request.user.sub` (the authenticated user id)
- instantiates Prisma repositories
- constructs the use case with those repositories
- catches typed use-case errors and maps them to HTTP status codes

Real example (`src/http/controllers/create-achievement.ts`):

    export async function createAchievement(
      request: FastifyRequest,
      reply: FastifyReply,
    ) {
      const createAchievementBodySchema = z.object({
        name: z.string().min(1, 'Nome é obrigatório'),
        category: z.string().min(1, 'Categoria é obrigatória'),
        year: z
          .number()
          .int()
          .min(1900, 'Ano deve ser maior que 1900'),
        type: z.enum(['COLLECTIVE', 'INDIVIDUAL']),
      })

      const { name, category, year, type } =
        createAchievementBodySchema.parse(request.body)

      const achievementRepository = new PrismaAchievementRepository()
      const athleteProfileRepository = new PrismaAthleteProfileRepository()

      const createAchievementUseCase = new CreateAchievementUseCase(
        achievementRepository,
        athleteProfileRepository,
      )

      const { achievement } = await createAchievementUseCase.execute({
        userId: request.user.sub,
        name,
        category,
        year,
        type,
      })

      return reply.status(201).send({ achievement })
    }

Controllers must not contain business rules. If a rule needs more than a shape check, it belongs in the use case.

---

# Use Case Style

Use cases are classes with constructor-injected repositories. They are pure (no HTTP objects, no Fastify types).

Real example (`src/http/use-cases/authenticate.ts`):

    export class AuthenticateUseCase {
      constructor(private usersRepository: UsersRepository) {}

      async execute({
        email,
        cpf,
        password,
      }: AuthenticateUseCaseRequest): Promise<AuthenticateUseCaseResponse> {
        if (!email && !cpf) {
          throw new InvalidCredentialsError()
        }

        const user = cpf
          ? await this.usersRepository.findByCpf(cpf)
          : await this.usersRepository.findByEmail(email!)

        if (!user) {
          throw new InvalidCredentialsError()
        }

        const doesPasswordMatches = await compare(password, user.password)

        if (!doesPasswordMatches) {
          throw new InvalidCredentialsError()
        }

        return { user }
      }
    }

Guard clauses and early `throw`s are preferred over nested `if/else`.

Request and response shapes for non-trivial use cases live in `src/http/use-cases/types.ts`.

---

# Error Classes

Typed domain errors live in `src/http/use-cases/errors/` and extend `Error`. They are never formatted as HTTP responses — that is the controller's or `app.setErrorHandler`'s job.

Real example (`src/http/use-cases/errors/invalid-credentials-error.ts`):

    export class InvalidCredentialsError extends Error {
      constructor() {
        super('Invalid credentials.')
      }
    }

When you add a new use-case error, it must have one file, one class, and an English message string. The user-facing PT-BR message is applied later in the controller or in `src/app.ts`.

---

# Validation Style

All external input is validated with **Zod** inside the controller, never inside the use case.

- schemas are declared inline at the top of the controller function
- `.parse()` throws `ZodError`, which is handled globally by `app.setErrorHandler` in `src/app.ts`
- error messages inside the schema are written in PT-BR

Agents must not introduce alternative validation libraries (class-validator, joi, yup, etc.).

---

# Repository Style

Repositories expose narrow, persistence-focused methods — never business logic.

- each repository has an **interface** at `src/http/repositories/<name>-repository.ts`
- the Prisma implementation lives at `src/http/repositories/prisma/prisma-<name>-repository.ts`
- the in-memory implementation lives at `src/http/repositories/in-memory/in-memory-<name>-repository.ts`
- the Prisma client is imported from `@/lib/prisma.js` (which internally imports from `../../generated/prisma/client.js`)

Real example (`src/http/repositories/users-repository.ts`):

    export interface UsersRepository {
      create(data: UserCreateInput): Promise<User>
      findByEmail(email: string): Promise<User | null>
      findByCpf(cpf: string): Promise<User | null>
      findByProvider(provider: AuthProvider, providerId: string): Promise<User | null>
      findById(userId: string): Promise<User | null>
      update(userId: string, data: Partial<User>): Promise<User>
      delete(userId: string): Promise<void>
    }

`findBy*` methods that can legitimately miss return `Promise<T | null>`. Use cases must handle the `null` explicitly with a guard clause and throw a typed error.

---

# Function and Method Size

Methods should be short, direct, focused on one task. When logic grows:

- extract a private method inside the use case
- extract a helper into `src/http/utils/` (HTTP-adjacent utilities) or `src/utils/` (pure helpers)
- do **not** create new classes "just in case"

---

# Parameter Object Rule

When a method or function requires more than 3 parameters, convert the parameter list to a single parameter object typed via an interface in `src/http/use-cases/types.ts`.

Example:

Preferred:

    interface CreateMatchUseCaseRequest {
      userId: string
      adversaryTeam: string
      date: Date
      myTeamId?: string
    }

    async execute(params: CreateMatchUseCaseRequest): Promise<CreateMatchUseCaseResponse> { ... }

Avoid positional parameters once you cross the threshold.

---

# Optional Properties vs Null

For DTOs and request/response types, prefer `field?: string` over `field: string | null`. Database records returned by Prisma may still use `| null` — that is acceptable because it reflects the schema.

---

# Conditional Style

Prefer guard clauses and early returns. Avoid deep nesting and long `else` chains.

Preferred:

    if (!email && !cpf) {
      throw new InvalidCredentialsError()
    }

    if (!user) {
      throw new InvalidCredentialsError()
    }

    const matches = await compare(password, user.password)
    if (!matches) {
      throw new InvalidCredentialsError()
    }

    return { user }

---

# Constructor Injection

Use cases must receive all their dependencies through the constructor. Do **not** call `new PrismaXRepository()` inside a use case — that breaks the ability to run unit tests with the in-memory doubles.

Preferred pattern (use case):

    export class CreateAchievementUseCase {
      constructor(
        private achievementRepository: AchievementRepository,
        private athleteProfileRepository: AthleteProfileRepository,
      ) {}
    }

The controller owns the composition root: it `new`s the Prisma repos and injects them.

---

# Comments

Prefer self-explanatory code. Use comments only when they explain *why*, not *what*. PT-BR domain comments explaining business rules are welcome (e.g. "não limitado no FREE, só conta").

Avoid comments that merely repeat the code.

---

# Abstraction Style

Prefer useful abstractions, not speculative ones.

- three similar controllers is better than a premature generic handler
- do not introduce `BaseRepository`, `BaseUseCase`, or any inheritance scaffolding
- do not introduce DI containers or factories for a codebase that instantiates repositories inline

When reuse is needed, extract:

- a focused helper in `src/http/utils/`
- a pure helper in `src/utils/`
- a library wrapper in `src/lib/`

---

# Type Casting

Avoid `as` unless TypeScript genuinely cannot narrow. Let inference do its work. When parsing environment variables or JWT payloads, trust the Zod schema or the `fastify-jwt` augmentation in `src/@types/fastify-jwt.d.ts` instead of casting.

---

# Response Shape

Controllers send JSON via `reply.status(n).send(body)`. Keep the response body explicit:

- `201` for resource creation, with the created entity nested under a key (e.g. `{ achievement }`)
- `200` for successful reads
- `401` for auth failures, `403` for authorization, `404` for missing resources, `400` for validation
- `402` for plan-limit hits (see `checkUsage` middleware)

Do **not** leak Prisma internals (e.g. raw `P2002` codes, DB column names) to the client.

---

# Final Principle

Good code in this project feels:

- Fastify-idiomatic, not Express-idiomatic or NestJS-idiomatic
- testable with the in-memory repository doubles without any HTTP setup
- readable by a reviewer who has never opened Prisma Studio
- consistent with the PT-BR / EN language split

When in doubt, read two or three existing controllers and match their shape.
