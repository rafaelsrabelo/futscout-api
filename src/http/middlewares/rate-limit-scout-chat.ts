import type { FastifyReply, FastifyRequest } from 'fastify'
import { RateLimiter } from '../../lib/rate-limiter.js'

/**
 * Limite de requisições do chat de busca.
 *
 * Substituiu a cota mensal por plano, que estava errada no alicerce: planos
 * existem só para atletas, e o chat é exclusivo de observador. Todo observador
 * caía no fallback do plano FREE e recebia "faça upgrade do seu plano" — sem
 * ter plano nenhum para comprar. O Helper IA vem incluso no app.
 *
 * O que precisa ser contido não é o uso legítimo (um olheiro gasta 3 mensagens
 * numa única busca), e sim rajada: token vazado, retry em laço no app, ou
 * alguém torrando a conta da OpenAI de propósito. Cada turno são 1 a 5 chamadas
 * pagas, então o freio é por minuto e por hora.
 */

/** Uma busca real gasta ~3 mensagens; 12/min cobre digitação rápida com folga. */
const perMinute = new RateLimiter(12, 60 * 1000)
/** Teto de sessão: acima disso não é mais uso humano de scouting. */
const perHour = new RateLimiter(120, 60 * 60 * 1000)

export async function rateLimitScoutChat(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const userId = request.user.sub

  const minute = perMinute.hit(userId)

  if (!minute.allowed) {
    return tooManyRequests(reply, minute.retryAfterSeconds)
  }

  const hour = perHour.hit(userId)

  if (!hour.allowed) {
    return tooManyRequests(reply, hour.retryAfterSeconds)
  }
}

function tooManyRequests(reply: FastifyReply, retryAfterSeconds: number) {
  return reply
    .header('Retry-After', String(retryAfterSeconds))
    .status(429)
    .send({
      message:
        'Muitas mensagens em pouco tempo. Espere um instante antes de continuar.',
      retryAfterSeconds,
    })
}

/** Só para teste — zera as janelas entre cenários. */
export function resetScoutChatRateLimit(): void {
  perMinute.reset()
  perHour.reset()
}
