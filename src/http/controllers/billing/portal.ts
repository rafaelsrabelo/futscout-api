import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { env } from '../../../env/index.js'
import { prisma } from '../../../lib/prisma.js'
import { stripe } from '../../../lib/stripe.js'

export async function portal(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const portalBodySchema = z.object({
    // URL de redirecionamento opcional (se não enviar, usa padrão do .env)
    returnUrl: z.string().url().optional(),
  })

  try {
    const { returnUrl } = portalBodySchema.parse(request.body || {})
    const userId = request.user.sub

    // Usar URL fornecida pelo app ou padrão do .env
    const finalReturnUrl = returnUrl || `${env.APP_REDIRECT_URL}/profile`

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return reply.status(404).send({ message: 'User not found' })
    }

    if (!user.stripeCustomerId) {
      return reply.status(400).send({
        message: 'No active subscription found. Please subscribe first.',
      })
    }

    // Criar sessão do portal de billing
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: finalReturnUrl,
    })

    return reply.status(200).send({
      url: portalSession.url,
    })
  } catch (error) {
    console.error('❌ Error creating portal session:', error)
    return reply.status(500).send({
      message: 'Error creating portal session',
    })
  }
}


