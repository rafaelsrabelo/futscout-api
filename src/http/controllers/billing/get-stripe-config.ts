import type { FastifyReply, FastifyRequest } from 'fastify'
import { env } from '../../../env/index.js'

/**
 * Retorna a chave publicável do Stripe para o frontend
 * Esta chave é segura para ser exposta no frontend
 */
export async function getStripeConfig(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  return reply.status(200).send({
    publishableKey: env.STRIPE_PUBLISHABLE_KEY || null,
  })
}
