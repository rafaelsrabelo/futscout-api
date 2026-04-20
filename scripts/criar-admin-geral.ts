// One-off: cria o usuário admin geral "dono de tudo" (futscore@gmail.com).
// Idempotente por email — se o usuário já existir, loga e retorna sem alterar.
//
// Uso:
//   npm run db:criar-admin-geral
//
// A senha abaixo é de bootstrap inicial. Em produção, rotacione via SQL
// após o primeiro login (ver docs/AUTENTICACAO-ADMIN.md).

const ADMIN_EMAIL = 'futscore@gmail.com'
const ADMIN_PASSWORD = 'Admin@123'
const ADMIN_NAME = 'FutScore Admin'

// Garante que o envSchema (que exige essas vars em dev/test) passe
// mesmo quando o .env local ainda não carrega o admin padrão.
// O .env continua tendo precedência porque seu dotenv/config roda antes,
// mas se o .env não define, estes valores destravam o boot do script.
process.env.ADMIN_EMAIL ??= ADMIN_EMAIL
process.env.ADMIN_PASSWORD ??= ADMIN_PASSWORD

const { hash } = await import('bcryptjs')
const { PrismaUsersRepository } = await import(
  '../src/http/repositories/prisma/prisma-users-repository.js'
)

async function main() {
  const usersRepository = new PrismaUsersRepository()

  const existing = await usersRepository.findByEmail(ADMIN_EMAIL)

  if (existing) {
    console.log(
      `ℹ️  Usuário ${ADMIN_EMAIL} já existe (id=${existing.id}, role=${existing.role}). Nada a fazer.`,
    )
    return
  }

  const passwordHash = await hash(ADMIN_PASSWORD, 6)

  const user = await usersRepository.create({
    email: ADMIN_EMAIL,
    name: ADMIN_NAME,
    password: passwordHash,
    role: 'ADMIN',
    provider: 'CREDENTIALS',
    emailVerified: true,
    isActive: true,
    isProfile: true,
  })

  console.log(
    `✅ Admin geral criado: ${user.email} (id=${user.id}). Agora faça login em POST /api/auth/sessions.`,
  )
}

main()
  .catch((error) => {
    console.error('❌ Erro ao criar admin geral:', error)
    process.exit(1)
  })
  .then(() => process.exit(0))
