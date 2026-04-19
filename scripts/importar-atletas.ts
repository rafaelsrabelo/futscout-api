import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma.js'

type Row = {
  nome: string
  cpf: string
  nascimento: string
  categoria: string
  equipe: string
  altura: string
  peso: string
  email: string
  genero: string
  peDominante: string
  cep: string
  numero: string
  acompanhamento: string
  posicao: string
}

type ViaCep = {
  logradouro?: string
  bairro?: string
  localidade?: string
  uf?: string
  erro?: boolean
}

const CSV_PATH = process.env.CSV_PATH ?? resolve(process.cwd(), 'data/atletas.csv')
const CSV_URL = process.env.CSV_URL
const EMAIL_DOMAIN = 'futscore.club'

async function loadCsv(): Promise<string> {
  if (CSV_URL) {
    console.log(`Baixando CSV de ${CSV_URL}`)
    const res = await fetch(CSV_URL)
    if (!res.ok) throw new Error(`Falha ao baixar CSV: ${res.status} ${res.statusText}`)
    return res.text()
  }
  if (!existsSync(CSV_PATH)) {
    throw new Error(
      `CSV não encontrado em ${CSV_PATH}. Defina CSV_URL ou CSV_PATH, ou coloque o arquivo em data/atletas.csv`,
    )
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
    nome: cols[0]?.trim() ?? '',
    cpf: cols[1]?.trim() ?? '',
    nascimento: cols[2]?.trim() ?? '',
    categoria: cols[3]?.trim() ?? '',
    equipe: cols[4]?.trim() ?? '',
    altura: cols[5]?.trim() ?? '',
    peso: cols[6]?.trim() ?? '',
    email: cols[7]?.trim() ?? '',
    genero: cols[8]?.trim() ?? '',
    peDominante: cols[9]?.trim() ?? '',
    cep: cols[10]?.trim() ?? '',
    numero: cols[11]?.trim() ?? '',
    acompanhamento: cols[12]?.trim() ?? '',
    posicao: cols[13]?.trim() ?? '',
  }))
}

function normalizeCpf(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  return digits.padStart(11, '0')
}

function normalizeCep(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  return digits.padStart(8, '0')
}

function parseBirthDate(raw: string): Date {
  const iso = raw.includes(' ') ? raw.replace(' ', 'T') : raw
  const date = new Date(iso)
  if (isNaN(date.getTime())) throw new Error(`Data inválida: ${raw}`)
  return date
}

function parseDecimal(raw: string): number {
  const normalized = raw.replace(',', '.').trim()
  const value = parseFloat(normalized)
  if (isNaN(value)) throw new Error(`Número inválido: ${raw}`)
  return value
}

function mapGender(raw: string): 'MALE' | 'FEMALE' | 'OTHER' {
  const v = raw.toLowerCase().trim()
  if (v.startsWith('masc') || v === 'm') return 'MALE'
  if (v.startsWith('fem') || v === 'f') return 'FEMALE'
  return 'OTHER'
}

function mapDominantFoot(raw: string): 'RIGHT' | 'LEFT' {
  const v = raw.toLowerCase().trim()
  return v.startsWith('esq') ? 'LEFT' : 'RIGHT'
}

function mapPosition(raw: string): 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD' {
  const v = raw.toLowerCase().trim()
  if (v.includes('goleiro') || v.includes('goalkeeper')) return 'GOALKEEPER'
  if (v.includes('zagu') || v.includes('lateral') || v.includes('defensor') || v.includes('defender')) return 'DEFENDER'
  if (v.includes('atac') || v.includes('forward') || v.includes('centroavante') || v.includes('ponta'))
    return 'FORWARD'
  return 'MIDFIELDER'
}

function isYes(raw: string): boolean {
  const v = raw.toLowerCase().trim()
  return v === 'sim' || v === 's' || v === 'yes' || v === 'true' || v === '1'
}

function baseNickname(fullName: string, cpf: string): string {
  const firstName = fullName.trim().split(/\s+/)[0] ?? 'atleta'
  const cleaned = firstName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
  const prefix = cleaned || 'atleta'
  return `${prefix}${cpf.slice(0, 3)}`
}

async function findAvailableNickname(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  fullName: string,
  cpf: string,
  excludeAthleteId?: string,
): Promise<string> {
  const base = baseNickname(fullName, cpf)
  const root = base.slice(0, base.length - 3)

  for (let len = 3; len <= 11; len++) {
    const candidate = `${root}${cpf.slice(0, len)}`
    const existing = await tx.athleteProfile.findUnique({
      where: { nickname: candidate },
      select: { id: true },
    })
    if (!existing || existing.id === excludeAthleteId) return candidate
  }
  return `${root}${cpf}_${Math.random().toString(36).slice(2, 5)}`
}

function deriveAcronym(teamName: string): string {
  const words = teamName
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (words.length >= 2) {
    return words
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 5)
  }
  return teamName.replace(/\s+/g, '').toUpperCase().slice(0, 3) || 'TIME'
}

const cepCache = new Map<string, ViaCep>()

async function lookupCep(cep: string): Promise<ViaCep> {
  const cached = cepCache.get(cep)
  if (cached) return cached
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
    const data = (await res.json()) as ViaCep
    cepCache.set(cep, data)
    return data
  } catch {
    const fallback: ViaCep = { erro: true }
    cepCache.set(cep, fallback)
    return fallback
  }
}

async function importAthlete(row: Row) {
  const cpf = normalizeCpf(row.cpf)
  if (cpf.length !== 11) throw new Error(`CPF inválido: ${row.cpf}`)

  const email = `${cpf}@${EMAIL_DOMAIN}`
  const currentClub = row.equipe || null

  const existingAthlete = await prisma.athleteProfile.findUnique({
    where: { cpf },
    select: { id: true },
  })

  if (existingAthlete) {
    const nickname = await findAvailableNickname(
      prisma,
      row.nome,
      cpf,
      existingAthlete.id,
    )
    await prisma.athleteProfile.update({
      where: { cpf },
      data: { nickname, currentClub },
    })
    return { action: 'updated' as const }
  }

  const cep = normalizeCep(row.cep)
  const endereco = await lookupCep(cep)
  const street = endereco.logradouro ?? 'Não informado'
  const district = endereco.bairro ?? 'Não informado'
  const city = endereco.localidade ?? 'Não informado'
  const state = endereco.uf ?? 'CE'

  const passwordHash = await bcrypt.hash(cpf, 10)

  await prisma.$transaction(async (tx) => {
    const nickname = await findAvailableNickname(tx, row.nome, cpf)

    const user = await tx.user.create({
      data: {
        name: row.nome,
        email,
        password: passwordHash,
        role: 'ATHLETE',
        isActive: true,
        isProfile: true,
        emailVerified: false,
      },
    })

    const athlete = await tx.athleteProfile.create({
      data: {
        userId: user.id,
        cpf,
        nickname,
        currentClub,
        gender: mapGender(row.genero),
        birthDate: parseBirthDate(row.nascimento),
        height: parseDecimal(row.altura),
        weight: parseDecimal(row.peso),
        dominantFoot: mapDominantFoot(row.peDominante),
        primaryPosition: mapPosition(row.posicao),
        hasNutritionist: isYes(row.acompanhamento),
        hasPsychologist: isYes(row.acompanhamento),
        hasPersonalTrainer: isYes(row.acompanhamento),
      },
    })

    await tx.address.create({
      data: {
        athleteId: athlete.id,
        zipCode: cep,
        street,
        number: row.numero || 'S/N',
        district,
        city,
        state,
      },
    })

    if (row.equipe) {
      const team = await tx.team.create({
        data: {
          name: row.equipe,
          acronym: deriveAcronym(row.equipe),
          userId: user.id,
          isPrincipal: true,
        },
      })

      await tx.athleteTeam.create({
        data: { athleteId: athlete.id, teamId: team.id },
      })
    }
  })

  return { action: 'created' as const }
}

async function main() {
  const csv = await loadCsv()
  const rows = parseCsv(csv)
  console.log(`\n${rows.length} atletas encontrados\n`)

  let created = 0
  let updated = 0
  const errors: { row: number; nome: string; cpf: string; error: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const result = await importAthlete(row)
      if (result.action === 'updated') {
        updated++
        console.log(`[${i + 1}/${rows.length}] ↻ ${row.nome} (atualizado)`)
      } else {
        created++
        console.log(`[${i + 1}/${rows.length}] ✓ ${row.nome}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      errors.push({ row: i + 2, nome: row.nome, cpf: row.cpf, error: message })
      console.log(`[${i + 1}/${rows.length}] ✗ ${row.nome} — ${message}`)
    }
  }

  console.log(`\n─── Resumo ───`)
  console.log(`Criados    : ${created}`)
  console.log(`Atualizados: ${updated}`)
  console.log(`Erros      : ${errors.length}`)
  if (errors.length > 0) {
    console.log(`\nLinhas com erro:`)
    for (const e of errors) console.log(`  L${e.row} ${e.nome} (${e.cpf}): ${e.error}`)
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
