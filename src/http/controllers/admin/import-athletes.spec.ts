import { describe, it, expect, vi } from 'vitest'

// Impede que o import do controller dispare a validação de env do Prisma
vi.mock('@/lib/prisma.js', () => ({ prisma: {} }))

import {
  normalizeCpf,
  isValidCpf,
  parseCsv,
  parseBirthDate,
  parseDecimal,
  mapGender,
  mapDominantFoot,
  mapPosition,
} from './import-athletes.js'

// CPFs válidos (dígitos verificadores corretos)
const VALID_CPF_MASKED = '529.982.247-25'
const VALID_CPF_PLAIN = '52998224725'
// 01234567890 — calculado: dígitos verificadores 9 e 0
const VALID_CPF_LEADING_ZERO = '01234567890'
const VALID_CPF_LEADING_ZERO_NO_PAD = '1234567890' // como sai do Excel (sem o zero)

describe('normalizeCpf', () => {
  it('removes mask', () => {
    expect(normalizeCpf('529.982.247-25')).toBe('52998224725')
  })

  it('restores leading zero lost by Excel', () => {
    expect(normalizeCpf(VALID_CPF_LEADING_ZERO_NO_PAD)).toBe(VALID_CPF_LEADING_ZERO)
  })

  it('keeps already-padded CPF intact', () => {
    expect(normalizeCpf(VALID_CPF_LEADING_ZERO)).toBe(VALID_CPF_LEADING_ZERO)
  })

  it('strips spaces and special chars', () => {
    expect(normalizeCpf(' 529 982 247 25 ')).toBe('52998224725')
  })
})

describe('isValidCpf', () => {
  it('accepts valid CPF without mask', () => {
    expect(isValidCpf(VALID_CPF_PLAIN)).toBe(true)
  })

  it('accepts valid CPF with leading zero', () => {
    expect(isValidCpf(VALID_CPF_LEADING_ZERO)).toBe(true)
  })

  it('rejects all-same-digit sequences', () => {
    for (const d of '0123456789') {
      expect(isValidCpf(d.repeat(11))).toBe(false)
    }
  })

  it('rejects CPF with wrong first check digit', () => {
    const wrong = VALID_CPF_PLAIN.slice(0, 9) + '0' + VALID_CPF_PLAIN[10]
    expect(isValidCpf(wrong)).toBe(false)
  })

  it('rejects CPF with wrong second check digit', () => {
    const wrong = VALID_CPF_PLAIN.slice(0, 10) + '0'
    expect(isValidCpf(wrong)).toBe(false)
  })

  it('rejects empty string padded to zeros', () => {
    expect(isValidCpf('00000000000')).toBe(false)
  })

  it('rejects CPF shorter than 11 digits', () => {
    expect(isValidCpf('1234567')).toBe(false)
  })

  it('rejects CPF longer than 11 digits', () => {
    expect(isValidCpf('123456789012')).toBe(false)
  })
})

describe('parseCsv', () => {
  const header = 'nome,cpf,nascimento,categoria,equipe,altura,peso,email,genero,peDominante,cep,numero,acompanhamento,posicao'

  it('parses a single data row', () => {
    const csv = `${header}\nJoão Silva,529.982.247-25,2005-03-15,Sub-17,Fortaleza EC,1.78,72.5,ignored,Masculino,Direito,60135-222,100,Sim,Atacante`
    const rows = parseCsv(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0].nome).toBe('João Silva')
    expect(rows[0].cpf).toBe('529.982.247-25')
    expect(rows[0].posicao).toBe('Atacante')
  })

  it('ignores blank lines', () => {
    const csv = `${header}\n\nJoão Silva,529.982.247-25,2005-03-15,Sub-17,,,,,,,,,,,\n`
    const rows = parseCsv(csv)
    expect(rows).toHaveLength(1)
  })

  it('handles quoted fields with commas inside', () => {
    const csv = `${header}\n"Silva, João",529.982.247-25,2005-03-15,,,,,,,,,,,,`
    const rows = parseCsv(csv)
    expect(rows[0].nome).toBe('Silva, João')
  })

  it('handles CRLF line endings', () => {
    const csv = `${header}\r\nJoão,529.982.247-25,2005-03-15,,,,,,,,,,,\r\n`
    const rows = parseCsv(csv)
    expect(rows).toHaveLength(1)
  })

  it('returns empty array for header-only CSV', () => {
    expect(parseCsv(header)).toHaveLength(0)
  })
})

describe('parseBirthDate', () => {
  it('parses ISO date string', () => {
    // Date-only ISO string é interpretado como UTC midnight — usar getUTC* para evitar desvio de timezone
    const d = parseBirthDate('2005-03-15')!
    expect(d.getUTCFullYear()).toBe(2005)
    expect(d.getUTCMonth()).toBe(2) // 0-indexed
    expect(d.getUTCDate()).toBe(15)
  })

  it('parses datetime string from Excel export', () => {
    const d = parseBirthDate('2005-03-15 00:00:00')!
    expect(d.getFullYear()).toBe(2005)
  })

  it('returns null for empty string', () => {
    expect(parseBirthDate('')).toBeNull()
    expect(parseBirthDate('   ')).toBeNull()
  })

  it('throws on invalid date', () => {
    expect(() => parseBirthDate('não-é-data')).toThrow('Data inválida')
  })
})

describe('parseDecimal', () => {
  it('parses dot decimal', () => {
    expect(parseDecimal('1.78')).toBe(1.78)
  })

  it('parses comma decimal (pt-BR)', () => {
    expect(parseDecimal('1,78')).toBe(1.78)
  })

  it('trims whitespace', () => {
    expect(parseDecimal(' 72.5 ')).toBe(72.5)
  })

  it('returns null for empty string', () => {
    expect(parseDecimal('')).toBeNull()
    expect(parseDecimal('   ')).toBeNull()
  })

  it('throws on non-numeric value', () => {
    expect(() => parseDecimal('abc')).toThrow('Número inválido')
  })
})

describe('mapGender', () => {
  it.each([
    ['Masculino', 'MALE'],
    ['masculino', 'MALE'],
    ['M', 'MALE'],
    ['m', 'MALE'],
    ['Feminino', 'FEMALE'],
    ['feminino', 'FEMALE'],
    ['F', 'FEMALE'],
    ['f', 'FEMALE'],
    ['Outro', 'OTHER'],
    ['', null],
  ])('"%s" → %s', (input, expected) => {
    expect(mapGender(input)).toBe(expected)
  })
})

describe('mapDominantFoot', () => {
  it.each([
    ['Esquerdo', 'LEFT'],
    ['esquerdo', 'LEFT'],
    ['Esq', 'LEFT'],
    ['Direito', 'RIGHT'],
    ['direito', 'RIGHT'],
    ['D', 'RIGHT'],
    ['', null],
  ])('"%s" → %s', (input, expected) => {
    expect(mapDominantFoot(input)).toBe(expected)
  })
})

describe('mapPosition', () => {
  it.each([
    ['Goleiro', 'GOALKEEPER'],
    ['goalkeeper', 'GOALKEEPER'],
    ['Zagueiro', 'DEFENDER'],
    ['Lateral', 'DEFENDER'],
    ['defensor', 'DEFENDER'],
    ['Atacante', 'FORWARD'],
    ['centroavante', 'FORWARD'],
    ['Ponta', 'FORWARD'],
    ['forward', 'FORWARD'],
    ['Meia', 'MIDFIELDER'],
    ['volante', 'MIDFIELDER'],
    ['', null],
  ])('"%s" → %s', (input, expected) => {
    expect(mapPosition(input)).toBe(expected)
  })
})
