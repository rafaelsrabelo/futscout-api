import { describe, expect, it } from 'vitest'
import { validateCpf } from './validateCpf.js'

describe('CPF Validation', () => {
  it.each([
    '97456321558',
    '71428793860',
    '87748248800',
    '877.482.488-00',
    '877.482.48800',
    '877.48248800',
  ])('should validate valid CPF %s', (document: string) => {
    const isValid = validateCpf(document)
    expect(isValid).toBe(true)
  })

  it.each([null, undefined, '111', '11111111111', 'abc'])(
    'should not validate invalid CPF %s',
    (document: string | null | undefined) => {
      const isValid = validateCpf(document as string)
      expect(isValid).toBe(false)
    },
  )
})
