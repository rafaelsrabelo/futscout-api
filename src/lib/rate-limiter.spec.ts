import { beforeEach, describe, expect, it } from 'vitest'
import { RateLimiter } from './rate-limiter.js'

const WINDOW_MS = 60 * 1000

let sut: RateLimiter

beforeEach(() => {
  sut = new RateLimiter(3, WINDOW_MS)
})

describe('RateLimiter', () => {
  it('should allow requests up to the limit', () => {
    expect(sut.hit('user-1').allowed).toBe(true)
    expect(sut.hit('user-1').allowed).toBe(true)
    expect(sut.hit('user-1').allowed).toBe(true)
  })

  it('should block once the limit is exceeded', () => {
    sut.hit('user-1')
    sut.hit('user-1')
    sut.hit('user-1')

    expect(sut.hit('user-1').allowed).toBe(false)
  })

  it('should count each user separately', () => {
    sut.hit('user-1')
    sut.hit('user-1')
    sut.hit('user-1')

    // Um usuário estourando não pode derrubar o chat de outro.
    expect(sut.hit('user-2').allowed).toBe(true)
  })

  it('should report how many requests are left', () => {
    expect(sut.hit('user-1').remaining).toEqual(2)
    expect(sut.hit('user-1').remaining).toEqual(1)
    expect(sut.hit('user-1').remaining).toEqual(0)
  })

  it('should release once the window turns', () => {
    const start = 1_000_000

    sut.hit('user-1', start)
    sut.hit('user-1', start)
    sut.hit('user-1', start)
    expect(sut.hit('user-1', start).allowed).toBe(false)

    expect(sut.hit('user-1', start + WINDOW_MS + 1).allowed).toBe(true)
  })

  it('should tell how long until the window turns', () => {
    const start = 1_000_000

    sut.hit('user-1', start)
    const result = sut.hit('user-1', start + 20_000)

    // Faltam 40s para a janela virar.
    expect(result.retryAfterSeconds).toEqual(40)
  })

  it('should never report a retry of zero while blocked', () => {
    const start = 1_000_000

    sut.hit('user-1', start)
    // Requisição no último milissegundo da janela ainda precisa esperar.
    const result = sut.hit('user-1', start + WINDOW_MS - 1)

    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1)
  })

  it('should reset a single key without touching the others', () => {
    sut.hit('user-1')
    sut.hit('user-2')

    sut.reset('user-1')

    expect(sut.hit('user-1').remaining).toEqual(2)
    expect(sut.hit('user-2').remaining).toEqual(1)
  })
})
