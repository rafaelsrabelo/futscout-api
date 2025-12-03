import type { FastifyReply, FastifyRequest } from 'fastify'
import type Stripe from 'stripe'
import { z } from 'zod'
import { env } from '../../../env/index.js'
import { prisma } from '../../../lib/prisma.js'
import { stripe } from '../../../lib/stripe.js'

export async function checkout(request: FastifyRequest, reply: FastifyReply) {
  const checkoutBodySchema = z.object({
    planId: z.string().uuid(),
    couponCode: z.string().optional(), // Código do cupom (ex: "2R1pZ2aq") ou código promocional (ex: "SOUFUTSCORE")
    // URLs de redirecionamento opcionais (se não enviar, usa padrão do .env)
    successUrl: z.string().url().optional(),
    cancelUrl: z.string().url().optional(),
  })

  try {
    const { planId, couponCode, successUrl, cancelUrl } =
      checkoutBodySchema.parse(request.body)
    const userId = request.user.sub

    // Usar URLs fornecidas pelo app ou padrão do .env
    const finalSuccessUrl =
      successUrl ||
      `${env.APP_REDIRECT_URL}/success?session_id={CHECKOUT_SESSION_ID}`
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

    // Verificar se o customer existe no Stripe, se não existir criar novo
    if (customerId) {
      try {
        // Tentar buscar o customer no Stripe
        await stripe.customers.retrieve(customerId)
        // Se chegou aqui, o customer existe e é válido
        console.log(`✅ Customer ${customerId} existe no Stripe`)
      } catch (error) {
        // Se o customer não existe, limpar o ID e criar novo
        const stripeError = error as { code?: string; message?: string }
        if (
          stripeError.code === 'resource_missing' ||
          stripeError.message?.includes('No such customer')
        ) {
          console.log(
            `⚠️ Customer ${customerId} não existe no Stripe, criando novo...`,
          )
          customerId = null
          // Limpar customerId inválido do banco
          await prisma.user.update({
            where: { id: userId },
            data: { stripeCustomerId: null },
          })
        } else {
          // Se for outro erro, relançar
          throw error
        }
      }
    }

    // Criar customer no Stripe se não existir
    if (!customerId) {
      console.log(`🆕 Criando novo customer no Stripe para usuário ${userId}`)
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user.id,
        },
      })

      customerId = customer.id
      console.log(`✅ Customer criado: ${customerId}`)

      // Salvar customerId no banco
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      })
    }

    // Criar sessão de checkout
    let session: Stripe.Checkout.Session
    try {
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [
          {
            price: plan.stripePriceId,
            quantity: 1,
          },
        ],
        ...(couponCode && {
          discounts: [{ coupon: couponCode }],
        }),
        success_url: finalSuccessUrl,
        cancel_url: finalCancelUrl,
        metadata: {
          userId,
          planId,
          ...(couponCode && { couponCode }),
        },
      })
    } catch (sessionError) {
      // Se o erro for de customer inválido, criar novo customer e tentar novamente
      const stripeSessionError = sessionError as {
        code?: string
        message?: string
      }
      if (
        stripeSessionError.code === 'resource_missing' ||
        stripeSessionError.message?.includes('No such customer')
      ) {
        console.log(
          `⚠️ Customer ${customerId} inválido ao criar sessão, criando novo...`,
        )
        // Limpar customerId inválido
        await prisma.user.update({
          where: { id: userId },
          data: { stripeCustomerId: null },
        })
        // Criar novo customer
        const newCustomer = await stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: {
            userId: user.id,
          },
        })
        customerId = newCustomer.id
        // Salvar novo customerId
        await prisma.user.update({
          where: { id: userId },
          data: { stripeCustomerId: customerId },
        })
        // Tentar criar sessão novamente
        session = await stripe.checkout.sessions.create({
          customer: customerId,
          mode: 'subscription',
          line_items: [
            {
              price: plan.stripePriceId,
              quantity: 1,
            },
          ],
          ...(couponCode && {
            discounts: [{ coupon: couponCode }],
          }),
          success_url: finalSuccessUrl,
          cancel_url: finalCancelUrl,
          metadata: {
            userId,
            planId,
            ...(couponCode && { couponCode }),
          },
        })
      } else {
        throw sessionError
      }
    }

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

    // Se for erro do Stripe, retornar mais detalhes
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as { type?: string; message?: string }
      console.error('Stripe error details:', {
        type: stripeError.type,
        message: stripeError.message,
      })
      return reply.status(500).send({
        message: 'Error creating checkout session',
        error: stripeError.message || 'Unknown Stripe error',
        type: stripeError.type,
      })
    }

    return reply.status(500).send({
      message: 'Error creating checkout session',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
