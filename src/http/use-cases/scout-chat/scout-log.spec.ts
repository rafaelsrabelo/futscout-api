import { describe, expect, it } from 'vitest'
import { redactToolArgs } from './scout-log.js'

describe('redactToolArgs', () => {
  it('should keep the filters that give diagnostics', () => {
    const result = redactToolArgs({
      primaryPosition: 'MIDFIELDER',
      hasManager: false,
      maxAge: 20,
    })

    expect(JSON.parse(result)).toEqual({
      primaryPosition: 'MIDFIELDER',
      hasManager: false,
      maxAge: 20,
    })
  })

  it('should omit the searched athlete name', () => {
    // 91% da base é menor de idade — nome pesquisado não vai para o log.
    const result = redactToolArgs({ name: 'João Vitor Andrade' })

    expect(result).not.toContain('João')
    expect(JSON.parse(result).name).toEqual('[omitido]')
  })

  it('should omit the searched nickname', () => {
    const result = redactToolArgs({ nickname: 'Joãozinho' })

    expect(result).not.toContain('Joãozinho')
  })

  it('should redact only the personal keys of a mixed search', () => {
    const result = redactToolArgs({
      name: 'Pedro',
      primaryPosition: 'FORWARD',
      currentClub: 'Ceará',
    })

    const parsed = JSON.parse(result)
    expect(parsed.name).toEqual('[omitido]')
    // Clube não identifica pessoa e é útil no diagnóstico.
    expect(parsed.currentClub).toEqual('Ceará')
    expect(parsed.primaryPosition).toEqual('FORWARD')
  })

  it('should handle an empty argument set', () => {
    expect(redactToolArgs({})).toEqual('{}')
  })
})
