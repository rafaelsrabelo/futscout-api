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

    // Verificar se é promotion code ou coupon ID
    let isPromotionCode = false
    let promotionCodeId: string | undefined

    if (couponCode) {
      try {
        // Tentar buscar como promotion code
        const promotionCodes = await stripe.promotionCodes.list({
          code: couponCode,
          limit: 1,
        })

        if (promotionCodes.data.length > 0) {
          // É um promotion code!
          promotionCodeId = promotionCodes.data[0]?.id
          isPromotionCode = true
          console.log(
            `✅ [checkout] Código promocional "${couponCode}" encontrado (ID: ${promotionCodeId})`,
          )
        } else {
          // Não é promotion code, usar como coupon ID diretamente
          console.log(
            `ℹ️ [checkout] Usando "${couponCode}" como ID do cupom diretamente`,
          )
        }
      } catch (promoError) {
        // Se der erro, tentar usar como coupon ID
        console.log(
          `ℹ️ [checkout] Erro ao buscar promotion code, usando "${couponCode}" como ID do cupom`,
        )
      }
    }

    // Criar sessão de checkout
    let session: Stripe.Checkout.Session
    try {
      console.log('🛒 [checkout] Criando sessão de checkout...')
      console.log('   Plan ID:', planId)
      console.log('   Plan Name:', plan.name)
      console.log('   Stripe Price ID:', plan.stripePriceId)
      console.log('   Customer ID:', customerId)
      console.log('   Coupon Code:', couponCode || 'nenhum')

      // Criar payload base
      // Usar Record<string, unknown> porque promotion_code não está no tipo do Stripe
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

      // Adicionar promotion code ou coupon
      if (couponCode) {
        if (isPromotionCode && promotionCodeId) {
          // Usar promotion code (campo específico do Stripe)
          sessionParams.promotion_code = promotionCodeId
          console.log(`   ✅ Usando promotion code: ${promotionCodeId}`)
        } else {
          // Usar coupon ID diretamente
          sessionParams.discounts = [{ coupon: couponCode }]
          console.log(`   ✅ Usando coupon ID: ${couponCode}`)
        }
      }

      session = await stripe.checkout.sessions.create(sessionParams)

      console.log('✅ [checkout] Sessão criada com sucesso:', session.id)
      console.log('   Session URL:', session.url)
      if (couponCode) {
        if (isPromotionCode) {
          console.log(`   ✅ Promotion code aplicado: ${couponCode}`)
        } else {
          console.log(`   ✅ Cupom aplicado: ${couponCode}`)
        }
      }
    } catch (sessionError) {
      console.error('❌ [checkout] Erro ao criar sessão:', sessionError)

      // Se o erro for de customer inválido, criar novo customer e tentar novamente
      const stripeSessionError = sessionError as {
        code?: string
        message?: string
        type?: string
      }

      console.error('   Erro detalhado:', {
        code: stripeSessionError.code,
        message: stripeSessionError.message,
        type: stripeSessionError.type,
      })
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
        // Usar Record<string, unknown> porque promotion_code não está no tipo do Stripe
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

        // Adicionar promotion code ou coupon novamente
        if (couponCode) {
          if (isPromotionCode && promotionCodeId) {
            retrySessionParams.promotion_code = promotionCodeId
          } else {
            retrySessionParams.discounts = [{ coupon: couponCode }]
          }
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
