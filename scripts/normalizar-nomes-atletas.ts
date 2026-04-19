import { prisma } from '../src/lib/prisma.js'

const DRY_RUN = process.env.DRY_RUN === 'true'

const LOWERCASE_WORDS = new Set([
  'da',
  'das',
  'de',
  'del',
  'di',
  'do',
  'dos',
  'du',
  'e',
  'van',
  'von',
  'y',
])

function titleCaseWord(word: string): string {
  if (word.length === 0) return word
  return word[0]!.toUpperCase() + word.slice(1).toLowerCase()
}

function titleCaseSegment(segment: string, isFirst: boolean): string {
  const lower = segment.toLowerCase()
  if (!isFirst && LOWERCASE_WORDS.has(lower)) return lower
  // Handle apostrophes and hyphens: "D'ÁVILA" → "D'Ávila", "MARIA-CLARA" → "Maria-Clara"
  return segment
    .split(/(['\-])/)
    .map((part) => {
      if (part === "'" || part === '-') return part
      return titleCaseWord(part)
    })
    .join('')
}

function normalizeName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ')
  if (!trimmed) return trimmed
  return trimmed
    .split(' ')
    .map((word, i) => titleCaseSegment(word, i === 0))
    .join(' ')
}

async function main() {
  console.log(`\n${DRY_RUN ? '[DRY RUN]' : '[LIVE]'} Normalizando nomes de atletas\n`)

  const athletes = await prisma.user.findMany({
    where: { athleteProfile: { isNot: null } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  console.log(`${athletes.length} atletas encontrados\n`)

  let changed = 0
  let unchanged = 0
  const errors: { id: string; name: string; error: string }[] = []

  for (let i = 0; i < athletes.length; i++) {
    const user = athletes[i]
    const normalized = normalizeName(user.name)

    if (normalized === user.name) {
      unchanged++
      continue
    }

    console.log(`[${i + 1}/${athletes.length}] "${user.name}" → "${normalized}"`)

    if (!DRY_RUN) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { name: normalized },
        })
        changed++
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        errors.push({ id: user.id, name: user.name, error: message })
        console.log(`  ✗ erro: ${message}`)
      }
    } else {
      changed++
    }
  }

  console.log(`\n─── Resumo ───`)
  console.log(`${DRY_RUN ? 'Mudariam' : 'Alterados'} : ${changed}`)
  console.log(`Inalterados  : ${unchanged}`)
  console.log(`Erros        : ${errors.length}`)
  if (errors.length > 0) {
    console.log(`\nErros:`)
    for (const e of errors) console.log(`  ${e.name} (${e.id}): ${e.error}`)
  }
  if (DRY_RUN) {
    console.log(`\n💡 Rode sem DRY_RUN pra aplicar as mudanças.`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
