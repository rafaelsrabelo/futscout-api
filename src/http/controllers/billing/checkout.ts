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
      } catch (error) {
        // Se o customer não existe, limpar o ID e criar novo
        const stripeError = error as { code?: string; message?: string }
        if (
          stripeError.code === 'resource_missing' ||
          stripeError.message?.includes('No such customer')
        ) {
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

    // Verificar se é promotion code ou coupon ID
    // Se for promotion code, buscar o cupom associado
    let finalCouponId: string | undefined = couponCode

    if (couponCode) {
      try {
        // Tentar buscar como promotion code (case-insensitive)
        const searchCodes = [
          couponCode,
          couponCode.toUpperCase(),
          couponCode.toLowerCase(),
        ]

        let promotionCodes = { data: [] as Stripe.PromotionCode[] }

        // Tentar cada variação
        for (const searchCode of searchCodes) {
          const result = await stripe.promotionCodes.list({
            code: searchCode,
            limit: 1,
          })
          if (result.data.length > 0) {
            promotionCodes = result
            break
          }
        }

        if (promotionCodes.data.length > 0) {
          // É um promotion code! Buscar o cupom associado
          const promotionCodeId = promotionCodes.data[0]?.id
          if (promotionCodeId) {
            // Buscar promotion code completo com cupom expandido
            const promotionCodeFull = await stripe.promotionCodes.retrieve(
              promotionCodeId,
              { expand: ['coupon'] },
            )

            // Acessar coupon - quando expandido, vem como objeto Coupon
            const promotionCodeWithCoupon =
              promotionCodeFull as Stripe.PromotionCode & {
                coupon?: string | Stripe.Coupon
              }
            const coupon = promotionCodeWithCoupon.coupon

            if (coupon) {
              if (typeof coupon === 'string') {
                finalCouponId = coupon
              } else if (typeof coupon === 'object' && coupon.id) {
                finalCouponId = coupon.id
              }
            } else {
              // Se não conseguiu extrair, não usar cupom inválido
              finalCouponId = undefined
            }
          }
        }
        // Se não encontrou promotion code, usar como coupon ID diretamente
      } catch (promoError) {
        // Se der erro, tentar usar como coupon ID
      }
    }

    // Criar sessão de checkout
    let session: Stripe.Checkout.Session
    try {
      // Criar payload base
      const sessionParams: Record<string, unknown> = {
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
          ...(couponCode && { couponCode }),
        },
      }

      // Adicionar cupom (já resolvido se era promotion code)
      if (finalCouponId) {
        sessionParams.discounts = [{ coupon: finalCouponId }]
      }

      session = await stripe.checkout.sessions.create(sessionParams)
    } catch (sessionError) {
      // Se o erro for de customer inválido, criar novo customer e tentar novamente
      const stripeSessionError = sessionError as {
        code?: string
        message?: string
        type?: string
      }
      if (
        stripeSessionError.code === 'resource_missing' ||
        stripeSessionError.message?.includes('No such customer')
      ) {
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
        const retrySessionParams: Record<string, unknown> = {
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
            ...(couponCode && { couponCode }),
          },
        }

        // Adicionar cupom novamente (já resolvido se era promotion code)
        if (finalCouponId) {
          retrySessionParams.discounts = [{ coupon: finalCouponId }]
        }

        session = await stripe.checkout.sessions.create(retrySessionParams)
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
