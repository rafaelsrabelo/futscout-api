import { hash } from 'bcryptjs'

import type { UsersRepository } from '../http/repositories/users-repository.js'

interface SeedAdminDeps {
  usersRepository?: UsersRepository
  email?: string
  password?: string
}

export async function seedAdmin(deps: SeedAdminDeps = {}) {
  let usersRepository = deps.usersRepository
  let email = deps.email
  let password = deps.password

  if (!usersRepository) {
    const [{ PrismaUsersRepository }, { env }] = await Promise.all([
      import('../http/repositories/prisma/prisma-users-repository.js'),
      import('@/env/index.js'),
    ])

    usersRepository = new PrismaUsersRepository()
    email = email ?? env.ADMIN_EMAIL
    password = password ?? env.ADMIN_PASSWORD
  }

  const existingAdmin = await usersRepository.findFirstByRole('ADMIN')

  if (existingAdmin) {
    return
  }

  if (!email || !password) {
    console.warn(
      '⚠️  Nenhum usuário ADMIN encontrado e ADMIN_EMAIL/ADMIN_PASSWORD não configurados — pulando seedAdmin.',
    )
    return
  }

  const passwordHash = await hash(password, 6)

  await usersRepository.create({
    email,
    name: 'Administrator',
    password: passwordHash,
    role: 'ADMIN',
    provider: 'CREDENTIALS',
    emailVerified: true,
    isActive: true,
    isProfile: true,
  })

  console.log(`✅ Usuário ADMIN criado com email ${email}.`)
}
