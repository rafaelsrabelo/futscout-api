import { describe, expect, it } from 'vitest'
import {
  generateVerificationCode,
  generateCodeExpirationDate,
} from '../lib/verification-code.js'

describe('Verification Code Utils', () => {
  it('should generate a 6-digit verification code', () => {
    const code = generateVerificationCode()

    expect(code).toHaveLength(6)
    expect(Number(code)).toBeGreaterThanOrEqual(100000)
    expect(Number(code)).toBeLessThanOrEqual(999999)
  })

  it('should generate different codes on multiple calls', () => {
    // Pode ser igual por coincidência, mas testamos múltiplas vezes
    const codes = new Set()
    for (let i = 0; i < 100; i++) {
      codes.add(generateVerificationCode())
    }

    // Deve haver pelo menos algumas diferenças em 100 códigos
    expect(codes.size).toBeGreaterThan(50)
  })

  it('should generate expiration date correctly', () => {
    const now = new Date()
    const expirationDate = generateCodeExpirationDate(15)

    const diffInMinutes =
      (expirationDate.getTime() - now.getTime()) / (1000 * 60)

    expect(diffInMinutes).toBeGreaterThanOrEqual(14.5)
    expect(diffInMinutes).toBeLessThanOrEqual(15.5)
  })

  it('should generate custom expiration date', () => {
    const now = new Date()
    const expirationDate = generateCodeExpirationDate(30)

    const diffInMinutes =
      (expirationDate.getTime() - now.getTime()) / (1000 * 60)

    expect(diffInMinutes).toBeGreaterThanOrEqual(29.5)
    expect(diffInMinutes).toBeLessThanOrEqual(30.5)
  })
})
