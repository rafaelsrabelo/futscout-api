import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { prisma } from '../src/lib/prisma.js'

type Row = {
  lance: string
  nome: string
  cpf: string
  dataHora: string
  local: string
  competicao: string
  categoria: string
  modalidade: string
  equipe: string
  adversario: string
  placar: string
  link: string
}

const CSV_PATH = process.env.CSV_PATH ?? resolve(process.cwd(), 'data/partidas.csv')
const CSV_URL = process.env.CSV_URL
const IMPORT_MARKER = 'IMPORTED_FROM_PARTIDAS_CSV'

async function loadCsv(): Promise<string> {
  if (CSV_URL) {
    console.log(`Baixando CSV de ${CSV_URL}`)
    const res = await fetch(CSV_URL)
    if (!res.ok) throw new Error(`Falha ao baixar CSV: ${res.status} ${res.statusText}`)
    return res.text()
  }
  if (!existsSync(CSV_PATH)) {
    throw new Error(`CSV não encontrado em ${CSV_PATH}. Defina CSV_URL ou CSV_PATH.`)
  }
  console.log(`Lendo CSV de ${CSV_PATH}`)
  return readFileSync(CSV_PATH, 'utf-8')
}

function parseCsv(text: string): Row[] {
  const lines: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') {
        inQuotes = false
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      if (row.some((f) => f.length > 0)) lines.push(row)
      row = []
      field = ''
    } else {
      field += c
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    if (row.some((f) => f.length > 0)) lines.push(row)
  }

  const [, ...body] = lines
  return body.map((cols) => ({
    lance: cols[0]?.trim() ?? '',
    nome: cols[1]?.trim() ?? '',
    cpf: cols[2]?.trim() ?? '',
    dataHora: cols[3]?.trim() ?? '',
    local: cols[4]?.trim() ?? '',
    competicao: cols[5]?.trim() ?? '',
    categoria: cols[6]?.trim() ?? '',
    modalidade: cols[7]?.trim() ?? '',
    equipe: cols[8]?.trim() ?? '',
    adversario: cols[9]?.trim() ?? '',
    placar: cols[10]?.trim() ?? '',
    link: cols[11]?.trim() ?? '',
  }))
}

function normalizeCpf(raw: string): string {
  return raw.replace(/\D/g, '').padStart(11, '0')
}

function parseDateTime(raw: string): Date {
  const iso = raw.includes(' ') ? raw.replace(' ', 'T') : raw
  const date = new Date(iso)
  if (isNaN(date.getTime())) throw new Error(`Data inválida: ${raw}`)
  return date
}

function mapCategory(raw: string) {
  const match = raw.match(/(\d+)/)
  if (!match) throw new Error(`Categoria inválida: ${raw}`)
  const n = parseInt(match[1], 10)
  return `U${n}` as
    | 'U5' | 'U6' | 'U7' | 'U8' | 'U9' | 'U10' | 'U11' | 'U12'
    | 'U13' | 'U14' | 'U15' | 'U16' | 'U17' | 'U18' | 'U19' | 'U20'
}

function mapModality(raw: string): 'FUT_11' | 'FUT_7' | 'FUTSAL' {
  const v = raw.toLowerCase().trim()
  if (v.includes('futsal')) return 'FUTSAL'
  if (v.includes('11')) return 'FUT_11'
  if (v.includes('7')) return 'FUT_7'
  throw new Error(`Modalidade inválida: ${raw}`)
}

function deriveAcronym(teamName: string): string {
  const words = teamName
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (words.length >= 2) {
    return words.map((w) => w[0]?.toUpperCase() ?? '').join('').slice(0, 5)
  }
  return teamName.replace(/\s+/g, '').toUpperCase().slice(0, 3) || 'TIME'
}

function parsePlacar(
  placar: string,
  equipeAtleta: string,
): { myScore: number; adversaryScore: number; result: 'WIN' | 'LOSS' | 'DRAW' } | null {
  const match = placar.match(/^(.+?)\s+(\d+)\s*x\s*(\d+)\s+(.+)$/i)
  if (!match) return null
  const leftTeam = match[1].trim().toLowerCase()
  const leftScore = parseInt(match[2], 10)
  const rightScore = parseInt(match[3], 10)
  const isLeft = leftTeam === equipeAtleta.trim().toLowerCase()
  const myScore = isLeft ? leftScore : rightScore
  const adversaryScore = isLeft ? rightScore : leftScore
  let result: 'WIN' | 'LOSS' | 'DRAW' = 'DRAW'
  if (myScore > adversaryScore) result = 'WIN'
  else if (myScore < adversaryScore) result = 'LOSS'
  return { myScore, adversaryScore, result }
}

type ImportResult =
  | { action: 'imported' }
  | { action: 'skipped'; reason: string }

async function importRow(row: Row): Promise<ImportResult> {
  if (row.lance.toUpperCase() !== 'GOL') {
    return { action: 'skipped', reason: `lance "${row.lance}" ignorado` }
  }

  const cpf = normalizeCpf(row.cpf)
  if (cpf.length !== 11) {
    return { action: 'skipped', reason: `CPF inválido: ${row.cpf}` }
  }

  const athlete = await prisma.athleteProfile.findUnique({
    where: { cpf },
    select: { id: true, userId: true },
  })
  if (!athlete) {
    return { action: 'skipped', reason: `atleta com CPF ${cpf} não cadastrado` }
  }

  const date = parseDateTime(row.dataHora)
  const category = mapCategory(row.categoria)
  const modality = mapModality(row.modalidade)

  let team = await prisma.team.findFirst({
    where: { userId: athlete.userId, name: row.equipe },
    select: { id: true },
  })
  if (!team) {
    team = await prisma.team.create({
      data: {
        userId: athlete.userId,
        name: row.equipe,
        acronym: deriveAcronym(row.equipe),
        isPrincipal: true,
      },
      select: { id: true },
    })
  }

  let competition: { id: string } | null = null
  if (row.competicao) {
    competition = await prisma.competition.findFirst({
      where: { athleteId: athlete.id, name: row.competicao },
      select: { id: true },
    })
    if (!competition) {
      competition = await prisma.competition.create({
        data: {
          athleteId: athlete.id,
          name: row.competicao,
          category,
          modality,
        },
        select: { id: true },
      })
    }
  }

  let match = await prisma.match.findFirst({
    where: {
      athleteId: athlete.id,
      date,
      adversaryTeam: row.adversario,
      location: row.local,
    },
    select: { id: true },
  })

  if (!match) {
    const placar = parsePlacar(row.placar, row.equipe)
    match = await prisma.match.create({
      data: {
        athleteId: athlete.id,
        myTeamId: team.id,
        adversaryTeam: row.adversario,
        date,
        modality,
        category,
        location: row.local,
        status: 'FINISHED',
        result: placar?.result ?? 'NOT_FINISHED',
        myTeamScore: placar?.myScore,
        adversaryScore: placar?.adversaryScore,
        competitionId: competition?.id ?? null,
        youtubeUrl: row.link || null,
      },
      select: { id: true },
    })
  }

  await prisma.play.create({
    data: {
      matchId: match.id,
      athleteId: athlete.id,
      playType: 'GOAL',
      observations: IMPORT_MARKER,
    },
  })

  return { action: 'imported' }
}

async function main() {
  const csv = await loadCsv()
  const rows = parseCsv(csv)
  console.log(`\n${rows.length} linhas no CSV\n`)

  const deleted = await prisma.play.deleteMany({
    where: { observations: IMPORT_MARKER },
  })
  if (deleted.count > 0) {
    console.log(`🗑  Removidos ${deleted.count} lances de import anterior\n`)
  }

  let imported = 0
  let skipped = 0
  const skipReasons = new Map<string, number>()
  const errors: { row: number; cpf: string; name: string; error: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const result = await importRow(row)
      if (result.action === 'imported') {
        imported++
      } else {
        skipped++
        skipReasons.set(result.reason, (skipReasons.get(result.reason) ?? 0) + 1)
      }
      if ((i + 1) % 100 === 0 || i === rows.length - 1) {
        console.log(
          `[${i + 1}/${rows.length}] ${imported} importados · ${skipped} pulados · ${errors.length} erros`,
        )
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      errors.push({ row: i + 2, cpf: row.cpf, name: row.nome, error: message })
      console.log(`[${i + 1}/${rows.length}] ✗ ${row.nome} — ${message}`)
    }
  }

  console.log(`\n─── Resumo ───`)
  console.log(`Lances importados : ${imported}`)
  console.log(`Linhas puladas    : ${skipped}`)
  console.log(`Erros             : ${errors.length}`)

  if (skipReasons.size > 0) {
    console.log(`\nMotivos de skip (top 10):`)
    const sorted = [...skipReasons.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
    for (const [reason, count] of sorted) {
      console.log(`  ${count}x - ${reason}`)
    }
  }

  if (errors.length > 0) {
    console.log(`\nErros (primeiros 20):`)
    for (const e of errors.slice(0, 20)) {
      console.log(`  L${e.row} ${e.name} (${e.cpf}): ${e.error}`)
    }
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
