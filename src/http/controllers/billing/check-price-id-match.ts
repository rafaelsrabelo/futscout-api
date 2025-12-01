import type { FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '../../../lib/prisma.js'
import { stripe } from '../../../lib/stripe.js'

/**
 * Endpoint temporário para verificar correspondência de Price IDs
 * GET /api/billing/check-price-id-match?email=rafaelrabelodev@gmail.com
 */
export async function checkPriceIdMatch(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const email = (request.query as { email?: string }).email

    if (!email) {
      return reply.status(400).send({
        message: 'Email parameter is required',
        example: '/api/billing/check-price-id-match?email=user@example.com',
      })
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        stripeCustomerId: true,
      },
    })

    if (!user) {
      return reply.status(404).send({ message: 'User not found' })
    }

    if (!user.stripeCustomerId) {
      return reply.status(400).send({
        message: 'User does not have stripeCustomerId',
        user: {
          id: user.id,
          email: user.email,
        },
      })
    }

    // Buscar planos do banco
    const plans = await prisma.plan.findMany({
      orderBy: { name: 'ASC' },
      select: {
        id: true,
        name: true,
        stripePriceId: true,
      },
    })

    // Buscar subscriptions no Stripe
    const stripeSubscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'all',
      limit: 10,
    })

    const result = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        stripeCustomerId: user.stripeCustomerId,
      },
      plans: plans.map((p) => ({
        name: p.name,
        id: p.id,
        stripePriceId: p.stripePriceId || null,
      })),
      stripeSubscriptions: stripeSubscriptions.data.map((sub) => {
        const priceId = sub.items.data[0]?.price?.id
        const matchingPlan = plans.find((p) => p.stripePriceId === priceId)

        return {
          id: sub.id,
          status: sub.status,
          priceId: priceId || null,
          livemode: sub.livemode,
          currentPeriodEnd: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
          matchingPlan: matchingPlan
            ? {
                name: matchingPlan.name,
                id: matchingPlan.id,
                stripePriceId: matchingPlan.stripePriceId,
              }
            : null,
          matchFound: !!matchingPlan,
        }
      }),
    }

    return reply.status(200).send(result)
  } catch (error) {
    console.error('❌ Error checking price ID match:', error)
    return reply.status(500).send({
      message: 'Error checking price ID match',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}




