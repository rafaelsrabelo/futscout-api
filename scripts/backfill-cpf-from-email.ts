/**
 * Backfill: extrai CPF do local-part do email (`<11 dígitos>@futscore.club`)
 * e preenche `User.cpf` quando estiver NULL.
 *
 * Pula usuários cujo CPF extraído já está em uso por outro User —
 * esses são candidatos ao merge (ver merge-duplicate-imports.ts).
 *
 * Uso:
 *   tsx scripts/backfill-cpf-from-email.ts            # dry-run (default)
 *   tsx scripts/backfill-cpf-from-email.ts --apply    # executa updates
 */
import { prisma } from '../src/lib/prisma.js'
import { validateCpf } from '../src/utils/validateCpf.js'

const EMAIL_REGEX = /^(\d{11})@futscore\.club$/i
const APPLY = process.argv.includes('--apply')

type Candidate = {
  userId: string
  email: string
  cpf: string
  name: string
}

async function main() {
  console.log(`Modo: ${APPLY ? 'APPLY (escreve)' : 'DRY-RUN (só lê)'}\n`)

  const users = await prisma.user.findMany({
    where: {
      cpf: null,
      email: { endsWith: '@futscore.club' },
    },
    select: { id: true, email: true, name: true },
  })

  console.log(`Users com email *@futscore.club e cpf=NULL: ${users.length}`)

  const valid: Candidate[] = []
  const invalidEmail: { userId: string; email: string }[] = []
  const invalidCpf: { userId: string; email: string; cpf: string }[] = []

  for (const u of users) {
    const m = EMAIL_REGEX.exec(u.email)
    if (!m) {
      invalidEmail.push({ userId: u.id, email: u.email })
      continue
    }
    const cpf = m[1]
    if (!validateCpf(cpf)) {
      invalidCpf.push({ userId: u.id, email: u.email, cpf })
      continue
    }
    valid.push({ userId: u.id, email: u.email, cpf, name: u.name })
  }

  // Verifica conflitos: outro User já tem esse CPF? Se sim, é par para merge.
  const cpfs = valid.map((v) => v.cpf)
  const taken = await prisma.user.findMany({
    where: { cpf: { in: cpfs } },
    select: { id: true, cpf: true, email: true },
  })
  const takenByCpf = new Map<string, { id: string; email: string }>()
  for (const t of taken) {
    if (t.cpf) takenByCpf.set(t.cpf, { id: t.id, email: t.email })
  }

  const toUpdate: Candidate[] = []
  const conflicts: {
    candidate: Candidate
    otherUser: { id: string; email: string }
  }[] = []
  for (const c of valid) {
    const other = takenByCpf.get(c.cpf)
    if (other) conflicts.push({ candidate: c, otherUser: other })
    else toUpdate.push(c)
  }

  console.log(`├─ a atualizar (CPF livre)        : ${toUpdate.length}`)
  console.log(`├─ candidatos a merge (CPF em uso): ${conflicts.length}`)
  console.log(`├─ email com formato inesperado   : ${invalidEmail.length}`)
  console.log(`└─ CPF extraído inválido          : ${invalidCpf.length}\n`)

  if (conflicts.length > 0) {
    console.log(
      `— Candidatos a merge (não tocados aqui — rode merge-duplicate-imports.ts) —`,
    )
    for (const c of conflicts.slice(0, 20)) {
      console.log(
        `  ${c.candidate.cpf}  user#1=${c.candidate.userId}  user#2=${c.otherUser.id} (${c.otherUser.email})`,
      )
    }
    if (conflicts.length > 20)
      console.log(`  ... e mais ${conflicts.length - 20}`)
    console.log()
  }

  if (invalidCpf.length > 0) {
    console.log(`— CPFs inválidos (revisar manual) —`)
    for (const i of invalidCpf.slice(0, 20)) {
      console.log(`  ${i.cpf}  ${i.email}  user=${i.userId}`)
    }
    if (invalidCpf.length > 20)
      console.log(`  ... e mais ${invalidCpf.length - 20}`)
    console.log()
  }

  if (!APPLY) {
    console.log(
      `Dry-run finalizado. Use --apply para executar ${toUpdate.length} updates.`,
    )
    return
  }

  if (toUpdate.length === 0) {
    console.log(`Nada a atualizar.`)
    return
  }

  let ok = 0
  const failed: { userId: string; cpf: string; error: string }[] = []
  for (const c of toUpdate) {
    try {
      await prisma.user.update({
        where: { id: c.userId },
        data: { cpf: c.cpf },
      })
      ok++
    } catch (err) {
      failed.push({
        userId: c.userId,
        cpf: c.cpf,
        error: err instanceof Error ? err.message.split('\n')[0] : String(err),
      })
    }
  }

  console.log(`\nAtualizados: ${ok}`)
  console.log(`Falhas     : ${failed.length}`)
  for (const f of failed)
    console.log(`  user=${f.userId} cpf=${f.cpf} — ${f.error}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
