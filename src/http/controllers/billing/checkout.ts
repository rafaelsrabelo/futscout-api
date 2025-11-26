import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { env } from '../../../env/index.js'
import { prisma } from '../../../lib/prisma.js'
import { stripe } from '../../../lib/stripe.js'

export async function checkout(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const checkoutBodySchema = z.object({
    planId: z.string().uuid(),
    // URLs de redirecionamento opcionais (se não enviar, usa padrão do .env)
    successUrl: z.string().url().optional(),
    cancelUrl: z.string().url().optional(),
  })

  try {
    const { planId, successUrl, cancelUrl } = checkoutBodySchema.parse(
      request.body,
    )
    const userId = request.user.sub

    // Usar URLs fornecidas pelo app ou padrão do .env
    const finalSuccessUrl =
      successUrl || `${env.APP_REDIRECT_URL}/success?session_id={CHECKOUT_SESSION_ID}`
    const finalCancelUrl = cancelUrl || `${env.APP_REDIRECT_URL}/cancel`

    // Buscar o plano
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    })

    if (!plan) {
      return reply.status(404).send({ message: 'Plan not found' })
    }

    if (!plan.stripePriceId) {
      return reply.status(400).send({
        message: 'Plan does not have a Stripe price ID configured',
      })
    }

    // Buscar ou criar customer no Stripe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return reply.status(404).send({ message: 'User not found' })
    }

    let customerId = user.stripeCustomerId

    // Criar customer no Stripe se não existir
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user.id,
        },
      })

      customerId = customer.id

      // Salvar customerId no banco
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      })
    }

    // Criar sessão de checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      metadata: {
        userId,
        planId,
      },
    })

    return reply.status(200).send({
      url: session.url,
      sessionId: session.id,
    })
  } catch (error) {
    console.error('❌ Error creating checkout session:', error)
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        message: 'Validation error',
        issues: error.format(),
      })
    }

    return reply.status(500).send({
      message: 'Error creating checkout session',
    })
  }
}


