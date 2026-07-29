/**
 * Limitador de requisições por janela fixa, em memória.
 *
 * Diferente do `AttemptLimiter`, que conta FALHAS para conter força bruta,
 * este conta TODAS as requisições — serve para conter abuso e gasto, não
 * ataque de adivinhação.
 *
 * LIMITAÇÃO CONHECIDA, a mesma do `attempt-limiter`: o estado vive no
 * processo. Não sobrevive a restart e não é compartilhado entre réplicas, então
 * com N instâncias o limite efetivo é `limit * N`. Isso é aceitável para o que
 * ele protege aqui (um usuário disparando centenas de chamadas pagas), e deve
 * ser trocado por Redis quando houver.
 *
 * A janela é fixa, não deslizante: na virada da janela é possível emitir até
 * 2x o limite em sequência. Para conter abuso isso não muda nada, e evita
 * guardar o timestamp de cada requisição.
 */

interface WindowEntry {
  count: number
  resetAt: number
}

/** Acima disso, varre entradas expiradas para o Map não crescer sem limite. */
const SWEEP_THRESHOLD = 10_000

export interface RateLimitResult {
  allowed: boolean
  /** Quantas requisições ainda cabem na janela atual. */
  remaining: number
  /** Segundos até a janela virar. Vai no Retry-After. */
  retryAfterSeconds: number
}

export class RateLimiter {
  private entries = new Map<string, WindowEntry>()

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Registra uma requisição e diz se ela pode passar. */
  hit(key: string, now: number = Date.now()): RateLimitResult {
    this.sweepIfNeeded(now)

    const entry = this.entries.get(key)

    if (!entry || entry.resetAt <= now) {
      const resetAt = now + this.windowMs
      this.entries.set(key, { count: 1, resetAt })

      return {
        allowed: true,
        remaining: this.limit - 1,
        retryAfterSeconds: Math.ceil(this.windowMs / 1000),
      }
    }

    entry.count += 1

    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((entry.resetAt - now) / 1000),
    )

    return {
      allowed: entry.count <= this.limit,
      remaining: Math.max(0, this.limit - entry.count),
      retryAfterSeconds,
    }
  }

  /** Usado em teste para isolar cenários. */
  reset(key?: string): void {
    if (key === undefined) {
      this.entries.clear()
      return
    }
    this.entries.delete(key)
  }

  private sweepIfNeeded(now: number): void {
    if (this.entries.size < SWEEP_THRESHOLD) return

    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) this.entries.delete(key)
    }
  }
}
