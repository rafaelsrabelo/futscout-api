import type { FastifyReply, FastifyRequest } from 'fastify'
import { env } from '../../../env/index.js'
import { prisma } from '../../../lib/prisma.js'
import { stripe } from '../../../lib/stripe.js'

export async function webhook(request: FastifyRequest, reply: FastifyReply) {
  const sig = request.headers['stripe-signature']

  if (!sig) {
    return reply
      .status(400)
      .send({ message: 'Missing stripe-signature header' })
  }

  if (!env.STRIPE_WEBHOOK_SECRET) {
    return reply
      .status(500)
      .send({ message: 'Stripe webhook secret not configured' })
  }

  let event: import('stripe').Stripe.Event

  try {
    // Verificar assinatura do webhook
    // O body deve ser um Buffer exatamente como recebido do Stripe
    const rawBody =
      (request as FastifyRequest & { rawBody?: Buffer }).rawBody ||
      (Buffer.isBuffer(request.body) ? request.body : null)

    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      console.error('❌ Webhook body is not a Buffer:', {
        type: typeof request.body,
        isBuffer: Buffer.isBuffer(request.body),
        hasRawBody: !!(request as FastifyRequest & { rawBody?: Buffer })
          .rawBody,
      })
      return reply.status(400).send({
        message: 'Invalid request body format. Expected raw Buffer.',
      })
    }

    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      env.STRIPE_WEBHOOK_SECRET,
    )
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err)
    return reply.status(400).send({ message: 'Invalid signature' })
  }

  try {
    // Processar eventos
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data
          .object as import('stripe').Stripe.Subscription

        // Buscar usuário pelo customerId
        const user = await prisma.user.findUnique({
          where: { stripeCustomerId: subscription.customer },
        })

        if (!user) {
          console.error('User not found for customer:', subscription.customer)
          return reply.status(200).send({ received: true })
        }

        // Buscar planId do metadata ou do priceId
        let planId: string | null = null

        // Tentar buscar pelo stripePriceId
        if (subscription.items?.data?.[0]?.price?.id) {
          const plan = await prisma.plan.findFirst({
            where: {
              stripePriceId: subscription.items.data[0].price.id,
            },
          })
          if (plan) {
            planId = plan.id
          }
        }

        if (!planId) {
          console.error('Plan not found for subscription:', subscription.id)
          return reply.status(200).send({ received: true })
        }

        // Criar ou atualizar subscription
        const currentPeriodEnd = new Date(
          subscription.current_period_end * 1000,
        )
        const status =
          subscription.status === 'active'
            ? 'active'
            : subscription.status === 'past_due'
              ? 'past_due'
              : 'canceled'

        // Buscar subscription existente pelo stripeSubscriptionId ou userId
        const existingSubscription = await prisma.subscription.findFirst({
          where: {
            OR: [
              { stripeSubscriptionId: subscription.id },
              { userId: user.id },
            ],
          },
        })

        if (existingSubscription) {
          await prisma.subscription.update({
            where: { id: existingSubscription.id },
            data: {
              planId,
              status,
              currentPeriodEnd,
              stripeSubscriptionId: subscription.id,
            },
          })
        } else {
          await prisma.subscription.create({
            data: {
              userId: user.id,
              planId,
              status,
              currentPeriodEnd,
              stripeSubscriptionId: subscription.id,
            },
          })
        }

        console.log('✅ Subscription updated:', subscription.id)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data
          .object as import('stripe').Stripe.Subscription

        // Buscar usuário pelo customerId
        const user = await prisma.user.findUnique({
          where: { stripeCustomerId: subscription.customer },
        })

        if (user) {
          await prisma.subscription.updateMany({
            where: {
              userId: user.id,
              stripeSubscriptionId: subscription.id,
            },
            data: {
              status: 'canceled',
            },
          })

          console.log('✅ Subscription canceled:', subscription.id)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as import('stripe').Stripe.Invoice

        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription,
          )

          const user = await prisma.user.findUnique({
            where: { stripeCustomerId: subscription.customer as string },
          })

          if (user) {
            await prisma.subscription.updateMany({
              where: {
                userId: user.id,
                stripeSubscriptionId: subscription.id,
              },
              data: {
                status: 'active',
                currentPeriodEnd: new Date(
                  subscription.current_period_end * 1000,
                ),
              },
            })

            console.log('✅ Payment succeeded, subscription activated')
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as import('stripe').Stripe.Invoice

        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription,
          )

          const user = await prisma.user.findUnique({
            where: { stripeCustomerId: subscription.customer as string },
          })

          if (user) {
            await prisma.subscription.updateMany({
              where: {
                userId: user.id,
                stripeSubscriptionId: subscription.id,
              },
              data: {
                status: 'past_due',
              },
            })

            console.log('⚠️ Payment failed, subscription set to past_due')
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return reply.status(200).send({ received: true })
  } catch (error) {
    console.error('❌ Error processing webhook:', error)
    return reply.status(500).send({ message: 'Webhook processing failed' })
  }
}
