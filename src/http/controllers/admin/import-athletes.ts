import type { FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma.js'

const EMAIL_DOMAIN = 'futscore.club'

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
  // padStart restaura o zero à esquerda perdido pelo Excel ao abrir o CSV
  return raw.replace(/\D/g, '').padStart(11, '0')
}

function isValidCpf(cpf: string): boolean {
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false // todos os dígitos iguais

  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i)
  let rem = (sum * 10) % 11
  if (rem === 10 || rem === 11) rem = 0
  if (rem !== parseInt(cpf[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i)
  rem = (sum * 10) % 11
  if (rem === 10 || rem === 11) rem = 0
  return rem === parseInt(cpf[10])
}

function normalizeCep(raw: string): string {
  return raw.replace(/\D/g, '').padStart(8, '0')
}

function parseBirthDate(raw: string): Date {
  const iso = raw.includes(' ') ? raw.replace(' ', 'T') : raw
  const date = new Date(iso)
  if (isNaN(date.getTime())) throw new Error(`Data inválida: ${raw}`)
  return date
}

function parseDecimal(raw: string): number {
  const value = parseFloat(raw.replace(',', '.').trim())
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
  return raw.toLowerCase().trim().startsWith('esq') ? 'LEFT' : 'RIGHT'
}

function mapPosition(raw: string): 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD' {
  const v = raw.toLowerCase().trim()
  if (v.includes('goleiro') || v.includes('goalkeeper')) return 'GOALKEEPER'
  if (v.includes('zagu') || v.includes('lateral') || v.includes('defensor') || v.includes('defender'))
    return 'DEFENDER'
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
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
  return `${cleaned || 'atleta'}${cpf.slice(0, 3)}`
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
  if (!isValidCpf(cpf)) throw new Error(`CPF inválido: ${row.cpf}`)

  const currentClub = row.equipe || null

  const existingAthlete = await prisma.athleteProfile.findUnique({
    where: { cpf },
    select: { id: true },
  })

  if (existingAthlete) {
    const nickname = await findAvailableNickname(prisma, row.nome, cpf, existingAthlete.id)
    await prisma.athleteProfile.update({ where: { cpf }, data: { nickname, currentClub } })
    return { action: 'updated' as const }
  }

  const cep = normalizeCep(row.cep)
  const endereco = await lookupCep(cep)

  const passwordHash = await bcrypt.hash(cpf, 10)

  await prisma.$transaction(async (tx) => {
    const nickname = await findAvailableNickname(tx, row.nome, cpf)

    const user = await tx.user.create({
      data: {
        name: row.nome,
        email: `${cpf}@${EMAIL_DOMAIN}`,
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
        street: endereco.logradouro ?? 'Não informado',
        number: row.numero || 'S/N',
        district: endereco.bairro ?? 'Não informado',
        city: endereco.localidade ?? 'Não informado',
        state: endereco.uf ?? 'CE',
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

export async function importAthletesAdmin(request: FastifyRequest, reply: FastifyReply) {
  const data = await request.file()
  if (!data) {
    return reply.status(400).send({ message: 'Arquivo CSV não enviado' })
  }

  const buffer = await data.toBuffer()
  const csvText = buffer.toString('utf-8')

  let rows: Row[]
  try {
    rows = parseCsv(csvText)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return reply.status(400).send({ message: `Erro ao ler CSV: ${message}` })
  }

  if (rows.length === 0) {
    return reply.status(400).send({ message: 'CSV sem linhas de dados' })
  }

  let created = 0
  let updated = 0
  const errors: { row: number; nome: string; cpf: string; error: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const result = await importAthlete(row)
      if (result.action === 'updated') {
        updated++
      } else {
        created++
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      errors.push({ row: i + 2, nome: row.nome, cpf: row.cpf, error: message })
    }
  }

  return reply.status(200).send({ created, updated, errors, total: rows.length })
}
