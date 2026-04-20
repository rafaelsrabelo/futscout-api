# Import Rules

This document defines the import conventions used in the Futscout API repository.

AI agents must follow these rules whenever generating or modifying code.

Consistent import structure improves readability, maintainability, and prevents runtime errors on an ESM + NodeNext project.

---

# Module System

This project is **ESM-only**:

- `package.json` has `"type": "module"`
- `tsconfig.json` has `"module": "NodeNext"`
- runtime is `tsx` (dev and production) which respects Node ESM resolution

This has two hard consequences that agents must always respect.

---

# Mandatory `.js` Extension on Relative Imports

Under NodeNext, **every relative import must include the `.js` extension**, even when importing a `.ts` file.

Correct:

    import { prisma } from '../../lib/prisma.js'
    import { AuthenticateUseCase } from './authenticate.js'
    import { InvalidCredentialsError } from './errors/invalid-credentials-error.js'
    import { PrismaUsersRepository } from '../repositories/prisma/prisma-users-repository.js'

Incorrect:

    import { prisma } from '../../lib/prisma'                      // missing .js
    import { AuthenticateUseCase } from './authenticate.ts'        // wrong extension
    import { InvalidCredentialsError } from './errors/invalid-credentials-error'

This is not optional — missing extensions break the dev server and production start-up.

Directory index imports must also include the extension: `import { env } from './env/index.js'`.

---

# Prisma Client Import

**Prisma types and the Prisma client itself come from `generated/prisma/`, NOT from `@prisma/client`.**

This is because `prisma/schema.prisma` sets a custom `output` path:

    generator client {
      provider = "prisma-client"
      output   = "../generated/prisma"
    }

The correct imports:

    // the runtime client — wrapped by src/lib/prisma.ts
    import { prisma } from '@/lib/prisma.js'

    // Prisma-generated model and enum types
    import type { User, AuthProvider } from 'generated/prisma/client.js'
    import type { UserCreateInput } from 'generated/prisma/models.js'

Incorrect — do NOT write:

    import { PrismaClient } from '@prisma/client'
    import type { User } from '@prisma/client'

The `@prisma/client` package path is not what this project generates into. Importing from it may appear to work in the IDE but will fail or deliver stale types after a regeneration.

Whenever a repository, controller, or use case needs a Prisma model type, import it from `generated/prisma/client.js` (or `generated/prisma/models.js` for create/update input types).

---

# Path Alias `@/`

The alias `@/*` → `./src/*` is configured in `tsconfig.json` and resolved by `vite-tsconfig-paths` for Vitest.

The alias is used in this project **only** for two cases:

1. importing the env loader: `import { env } from '@/env/index.js'`
2. importing library integrations: `import { prisma } from '@/lib/prisma.js'`, `import { openai } from '@/lib/openai.js'`, etc.

For everything else inside `src/http/`, prefer **relative imports**. That's how the existing code is organized — controllers import their use cases via `'../use-cases/authenticate.js'`, not `'@/http/use-cases/authenticate.js'`.

Rationale: within a single folder tree (`src/http/`), relative imports make the module graph easy to follow. `@/` is reserved for crossing into the shared `env` and `lib` zones.

Whichever you pick, remember the `.js` extension.

---

# Import Order

Imports must follow this order, separated by one blank line between groups:

1. Node built-ins (`node:fs`, `node:crypto`, …)
2. External libraries (`fastify`, `zod`, `bcryptjs`, `stripe`, …)
3. Type imports from Prisma generated types (`generated/prisma/*`)
4. Internal `@/` alias imports (env, lib)
5. Relative imports (`../`, `./`)

Example (`src/http/controllers/authenticate.ts`, cleaned up):

    import type { FastifyReply, FastifyRequest } from 'fastify'
    import z from 'zod'

    import { env } from '@/env/index.js'

    import { PrismaUsersRepository } from '../repositories/prisma/prisma-users-repository.js'
    import { PrismaRefreshTokenRepository } from '../repositories/prisma/prisma-refresh-token-repository.js'
    import { AuthenticateUseCase } from '../use-cases/authenticate.js'
    import { InvalidCredentialsError } from '../use-cases/errors/invalid-credentials-error.js'

Agents must keep this ordering consistent.

---

# Type-Only Imports

Type-only imports must use `import type`:

    import type { FastifyReply, FastifyRequest } from 'fastify'
    import type { User } from 'generated/prisma/client.js'
    import type { UsersRepository } from '../repositories/users-repository.js'

This keeps intent clear and allows the TypeScript compiler to fully erase these imports.

Mixed imports (types + values from the same module) are acceptable but prefer splitting them when the file grows:

    import { z } from 'zod'
    import type { ZodError } from 'zod'

---

# Fastify Imports

Fastify types come from `'fastify'`. Plugins are registered via dynamic import inside `src/app.ts`:

    app.register(import('@fastify/multipart'), { ... })
    app.register(import('@fastify/jwt'), { ... })

Do not move these dynamic imports to top-level static imports — this pattern is what Fastify recommends for plugin registration in ESM.

---

# Zod Imports

Two styles exist in this codebase:

    import z from 'zod'           // seen in newer controllers (authenticate.ts, create-achievement.ts)
    import { z } from 'zod'       // standard form

Both work. When adding a new file, match the neighboring style. Prefer `import { z } from 'zod'` if the file is brand new and has no neighbors.

---

# Stripe Imports

Use the Stripe client from `src/lib/stripe.ts`. Do not instantiate a new `Stripe` SDK client inside controllers — that would duplicate configuration and connection pooling.

    import { stripe } from '@/lib/stripe.js'

---

# Cloudflare R2 Imports

Use the R2 wrapper from `src/lib/cloudflare-r2.ts`:

    import { r2Client, generatePresignedUploadUrl, deleteR2Object } from '@/lib/cloudflare-r2.js'

Do not import `@aws-sdk/client-s3` directly inside a controller — always go through the wrapper.

---

# Test Imports

Tests import `vitest` primitives and the in-memory repository. Real example (`src/http/use-cases/authenticate.spec.ts`):

    import { expect, describe, it, beforeEach } from 'vitest'
    import { hash } from 'bcryptjs'

    import { InMemoryUsersRepository } from '../repositories/in-memory/in-merory-users-repository.js'
    import { AuthenticateUseCase } from './authenticate.js'
    import { InvalidCredentialsError } from './errors/invalid-credentials-error.js'

Tests must not import Prisma implementations. They must not import from `'fastify'`. They must not spin up an HTTP server.

---

# No Wildcard Imports

Avoid `import * as` unless a library specifically requires that pattern.

Preferred:

    import { z } from 'zod'
    import { hash, compare } from 'bcryptjs'

Avoid:

    import * as z from 'zod'

---

# No Unused Imports

Every import must be used. The linter is configured to surface unused imports — do not suppress that rule.

---

# No Circular Imports

If two modules start depending on each other, the design is wrong. Common fixes:

- extract the shared type/interface into a neutral file (e.g. `src/http/use-cases/types.ts`, `src/http/repositories/<name>-repository.ts`)
- move constants into a dedicated module
- reconsider which layer owns the logic

---

# Import Clarity Rule

Imports should make the ownership of code obvious at a glance:

- external → clearly from node_modules
- `@/env` / `@/lib` → shared plumbing
- `../repositories/...` → sibling persistence layer
- `./errors/...` → local error classes

Optimize for clarity, not cleverness.

---

# Consistency Rule

When modifying an existing file, follow the import style used in that file as long as it does not conflict with this document. Repo-wide consistency beats personal preference.

---

# Final Rule

Imports must always be:

- minimal (no unused imports)
- explicit (`.js` extensions, `import type` when appropriate)
- ordered (groups separated by blank lines)
- sourced correctly (Prisma from `generated/prisma/`, Stripe/R2 via wrappers)
- consistent with neighboring files

AI agents must treat imports as part of the architecture.
