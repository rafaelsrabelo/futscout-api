# Testing Rules

This document defines how automated tests must be written and organized in the Futscout API repository.

AI agents must follow these rules whenever generating or modifying tests.

The goal is to keep tests fast, deterministic, and aligned with the Controller → Use Case → Repository architecture.

---

# Test Framework

This project uses **Vitest**.

- Configuration: `vite.config.ts` (simple — only `vite-tsconfig-paths`)
- Scripts:
  - `npm run test` — one-shot run
  - `npm run test:watch` — watch mode
  - `npm run test:coverage` — v8 coverage report
  - `npm run test:ui` — Vitest UI

Running a single file or a single test name:

    npx vitest run path/to/file.spec.ts
    npx vitest run -t "should authenticate"

Agents must not introduce alternative test frameworks (Jest, Mocha, Node test runner).

---

# Test Location

Tests live **co-located** with the source file they test, using the `.spec.ts` suffix. There is no separate `tests/` directory.

Examples:

    src/http/use-cases/authenticate.ts
    src/http/use-cases/authenticate.spec.ts

    src/http/use-cases/create-athlete-profile.ts
    src/http/use-cases/create-athlete-profile.spec.ts

    src/lib/verification-code.ts
    src/lib/verification-code.spec.ts

    src/http/repositories/in-memory/in-memory-verification-code-repository.ts
    src/http/repositories/in-memory/in-memory-verification-code-repository.spec.ts

    src/utils/validateCpf.ts
    src/utils/validateCpf.spec.ts

Agents must not move these tests to a separate `tests/` folder.

---

# Unit Tests Against In-Memory Repositories

The canonical testing pattern in this project:

1. Instantiate the in-memory repository (or a fresh set of them)
2. Instantiate the use case under test, injecting the in-memory repository
3. Call `useCase.execute(...)` and assert on the result or the thrown error

Real example (`src/http/use-cases/authenticate.spec.ts`, cleaned up):

    import { expect, describe, it, beforeEach } from 'vitest'
    import { hash } from 'bcryptjs'

    import { InMemoryUsersRepository } from '../repositories/in-memory/in-merory-users-repository.js'
    import { AuthenticateUseCase } from './authenticate.js'
    import { InvalidCredentialsError } from './errors/invalid-credentials-error.js'

    let usersRepository: InMemoryUsersRepository
    let sut: AuthenticateUseCase

    beforeEach(() => {
      usersRepository = new InMemoryUsersRepository()
      sut = new AuthenticateUseCase(usersRepository)
    })

    describe('Authenticate Use Case', () => {
      it('should be able to authenticate', async () => {
        await usersRepository.create({
          name: 'Rafael Rabelo',
          email: 'rafaelrabelodev@gmail.com',
          password: await hash('123456', 6),
          role: 'ATHLETE',
        })

        const { user } = await sut.execute({
          email: 'rafaelrabelodev@gmail.com',
          password: '123456',
        })

        expect(user.id).toEqual(expect.any(String))
      })

      it('should not be able to authenticate with wrong password', async () => {
        await usersRepository.create({
          name: 'Rafael Rabelo',
          email: 'rafaelrabelodev@gmail.com',
          password: await hash('123456', 6),
          role: 'ATHLETE',
        })

        await expect(() =>
          sut.execute({
            email: 'rafaelrabelodev@gmail.com',
            password: 'wrong-password',
          }),
        ).rejects.toBeInstanceOf(InvalidCredentialsError)
      })
    })

The variable named `sut` ("system under test") is a convention used throughout the codebase. Agents should follow it for consistency.

---

# New Use Case → New In-Memory Repository

A new use case always requires two things to be testable:

1. a new interface at `src/http/repositories/<name>-repository.ts` (or extended methods on an existing interface)
2. a matching in-memory implementation at `src/http/repositories/in-memory/in-memory-<name>-repository.ts`

Without the in-memory implementation, the spec cannot exist.

Agents must not:

- write tests that instantiate `PrismaXRepository`
- write tests that require a live PostgreSQL connection (other than explicit integration tests, which currently don't exist in this repo)
- mock Prisma with `vi.mock('@/lib/prisma.js', ...)` — use the in-memory repository instead

---

# No HTTP in Tests

Tests must not:

- import `'fastify'`
- construct a Fastify `app`
- issue `app.inject(...)` requests

These are use-case-level unit tests. The controller layer (Zod + HTTP mapping) is intentionally **not** covered by tests in the current architecture. That trade-off keeps tests fast and deterministic.

If an HTTP-level test is genuinely needed (e.g. verifying the Stripe webhook signature path), discuss it with the human before adding a new test style to the repo.

---

# No External Services

Tests must not call real external services:

- no live PostgreSQL
- no live Stripe
- no live Cloudflare R2
- no live OpenAI
- no live SMTP
- no real HTTP calls

When a use case depends on one of these, the integration module from `src/lib/` must be injectable or explicitly mocked inside the test.

---

# Deterministic Tests

Tests must always be deterministic. Agents must avoid:

- `Date.now()` / `new Date()` without control — use Vitest's fake timers (`vi.useFakeTimers()`) when time matters
- `Math.random()` without a seeded source
- environment-dependent behavior
- order-dependent assertions

Each test must pass every run in every order.

---

# What Should Be Tested

Agents should prioritize tests for:

- business rules inside use cases (validation invariants, ownership checks, error paths)
- pure helpers in `src/utils/` (e.g. `validateCpf`) and `src/lib/` (e.g. `verification-code`)
- non-trivial in-memory repository behavior (when the repository encodes data shape assumptions that the tests rely on)

---

# What Should Not Be Tested

Agents should avoid writing tests for:

- trivial getters/setters
- Prisma repository implementations (covered implicitly via dev-time usage; no value in asserting that Prisma works)
- Zod schema internals
- Fastify plugin registration
- the Prisma client itself

Tests must provide real confidence. Tests that only assert "the code compiles" or "the mock was called" should not be created.

---

# Test Naming

Test descriptions use natural-language sentences starting with "should":

    it('should be able to authenticate')
    it('should not be able to authenticate with wrong password')
    it('should not be able to authenticate with wrong email')
    it('should throw when the profile does not belong to the user')

`describe` blocks group tests by subject and end with the subject's layer name:

    describe('Authenticate Use Case', () => { ... })
    describe('Create Athlete Profile Use Case', () => { ... })

Avoid vague names like `test1`, `works_correctly`, `handles_case`.

---

# Test Structure

Each test follows Arrange → Act → Assert.

Arrange:
- seed the in-memory repository with the fixtures the test needs

Act:
- call `sut.execute(...)`

Assert:
- use `expect(...)` on the return value
- use `await expect(() => sut.execute(...)).rejects.toBeInstanceOf(ErrorClass)` on the error path

Do not split a single behavior check across multiple tests.

---

# Test Independence

Each test must run in isolation. The `beforeEach` block re-creates fresh in-memory repositories and a fresh `sut` so that no mutable state bleeds between tests.

Tests must not:

- share a mutable in-memory repository instance across `it` blocks
- depend on execution order
- rely on a prior test's side effects

---

# Test Performance

Tests must run quickly. The current suite completes in seconds because it avoids network, filesystem, and DB I/O. Agents must preserve this:

- no `await new Promise(r => setTimeout(r, 500))` to wait for async things — use Vitest's fake timers
- no real SMTP/HTTP/DB calls
- no heavy fixture generation

Fast feedback is part of the contract.

---

# Test Creation Policy

AI agents must only generate tests when:

- the task explicitly asks for tests
- the agent is adding a new use case (in which case a basic spec covering the happy path and the main error path is expected)
- the agent is fixing a bug (in which case a regression test capturing the bug is expected)

Agents must not generate tests speculatively when implementing unrelated features — do not double the diff "for completeness".

When the task does require tests, agents must follow all rules in this document.

---

# Final Rule

Good tests protect the architecture and the behavior of the system.

A spec is only useful if it:

- drives the design toward injectable dependencies (hence the in-memory repositories)
- fails when the described business rule is broken
- reads like a specification of what the use case must do

Generated code that contains meaningful business logic should be accompanied by a spec of that quality.
