import type { FastifyReply, FastifyRequest } from 'fastify'
import type Stripe from 'stripe'
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
    console.log(`📥 [webhook] Evento recebido: ${event.type}`)

    // Processar eventos
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data
          .object as import('stripe').Stripe.Checkout.Session

        console.log('✅ [webhook] Checkout session completed:', session.id)
        console.log('   Customer:', session.customer)
        console.log('   Subscription:', session.subscription)
        console.log('   Metadata:', session.metadata)

        // Se tem subscription, processar ela
        if (session.subscription && typeof session.subscription === 'string') {
          try {
            const subscription = (await stripe.subscriptions.retrieve(
              session.subscription,
            )) as Stripe.Subscription

            // Buscar usuário pelo customerId ou metadata
            let user = null
            if (session.customer && typeof session.customer === 'string') {
              user = await prisma.user.findFirst({
                where: { stripeCustomerId: session.customer },
              })
            }

            // Se não encontrou pelo customerId, tentar pelo metadata
            if (!user && session.metadata?.userId) {
              user = await prisma.user.findUnique({
                where: { id: session.metadata.userId },
              })
            }

            if (!user) {
              console.error(
                `❌ [webhook] User not found for checkout session: ${session.id}`,
              )
              return reply.status(200).send({ received: true })
            }

            // Buscar plano pelo priceId
            const priceId = subscription.items?.data?.[0]?.price?.id
            if (!priceId) {
              console.error(
                `❌ [webhook] PriceId not found in subscription: ${subscription.id}`,
              )
              return reply.status(200).send({ received: true })
            }

            const plan = await prisma.plan.findFirst({
              where: { stripePriceId: priceId },
            })

            if (!plan) {
              console.error(
                `❌ [webhook] Plan not found for priceId: ${priceId}`,
              )
              console.error('💡 [webhook] Price IDs disponíveis no banco:')
              const allPlans = await prisma.plan.findMany({
                select: { name: true, stripePriceId: true },
              })
              for (const p of allPlans) {
                console.error(
                  `     - ${p.name}: ${p.stripePriceId || 'não configurado'}`,
                )
              }
              console.error(
                '💡 [webhook] O priceId da subscription não corresponde a nenhum plano no banco',
              )
              console.error(
                '💡 [webhook] Solução: Atualize o stripePriceId do plano PREMIUM no banco',
              )
              return reply.status(200).send({ received: true })
            }

            // Obter current_period_end (pode estar no item para billing_mode: flexible)
            let currentPeriodEndTimestamp: number | undefined =
              subscription.current_period_end

            if (!currentPeriodEndTimestamp) {
              // Tentar pegar do subscription item (para billing_mode: flexible)
              const firstItem = subscription.items?.data?.[0]
              const itemPeriodEnd = (
                firstItem as { current_period_end?: number } | undefined
              )?.current_period_end

              if (itemPeriodEnd && typeof itemPeriodEnd === 'number') {
                currentPeriodEndTimestamp = itemPeriodEnd
              }
            }

            if (!currentPeriodEndTimestamp || typeof currentPeriodEndTimestamp !== 'number') {
              console.error(
                '❌ [webhook] current_period_end não encontrado na subscription',
              )
              return reply.status(200).send({ received: true })
            }

            // Criar ou atualizar subscription
            const currentPeriodEnd = new Date(
              currentPeriodEndTimestamp * 1000,
            )
            const status =
              subscription.status === 'active' ||
              subscription.status === 'trialing'
                ? 'active'
                : subscription.status === 'past_due'
                  ? 'past_due'
                  : 'canceled'

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
                  planId: plan.id,
                  status,
                  currentPeriodEnd,
                  stripeSubscriptionId: subscription.id,
                },
              })
              console.log(
                `✅ [webhook] Subscription atualizada: ${existingSubscription.id}`,
              )
            } else {
              await prisma.subscription.create({
                data: {
                  userId: user.id,
                  planId: plan.id,
                  status,
                  currentPeriodEnd,
                  stripeSubscriptionId: subscription.id,
                },
              })
              console.log(
                `✅ [webhook] Subscription criada para usuário: ${user.id}`,
              )
            }
          } catch (error) {
            console.error(
              '❌ [webhook] Erro ao processar checkout.session.completed:',
              error,
            )
          }
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        try {
          const subscription = event.data.object as Stripe.Subscription & {
            current_period_end: number
          }

          console.log('📦 [webhook] Processando subscription:', subscription.id)
          console.log('   Customer:', subscription.customer)
          console.log('   Status:', subscription.status)
          console.log('   Price ID:', subscription.items?.data?.[0]?.price?.id)

          // Validar customer
          if (!subscription.customer) {
            console.error('❌ [webhook] Subscription sem customer ID')
            return reply.status(200).send({ received: true })
          }

          const customerId =
            typeof subscription.customer === 'string'
              ? subscription.customer
              : (subscription.customer as { id?: string })?.id || null

          if (!customerId) {
            console.error('❌ [webhook] Não foi possível extrair customer ID')
            return reply.status(200).send({ received: true })
          }

          // Buscar usuário pelo customerId
          const user = await prisma.user.findFirst({
            where: { stripeCustomerId: customerId },
          })

          if (!user) {
            console.error(
              '❌ [webhook] User not found for customer:',
              customerId,
            )
            console.error(
              '   Verifique se o stripeCustomerId está correto no banco',
            )
            return reply.status(200).send({ received: true })
          }

          console.log(
            '✅ [webhook] User encontrado:',
            user.id,
            `(${user.email})`,
          )

          // Buscar planId pelo stripePriceId
          const priceId = subscription.items?.data?.[0]?.price?.id
          if (!priceId) {
            console.error(
              '❌ [webhook] Price ID não encontrado na subscription',
            )
            return reply.status(200).send({ received: true })
          }

          console.log('🔍 [webhook] Buscando plano para priceId:', priceId)

          // Buscar todos os planos primeiro para debug
          const allPlans = await prisma.plan.findMany({
            select: { name: true, stripePriceId: true },
          })
          console.log('📋 [webhook] Planos disponíveis no banco:')
          for (const p of allPlans) {
            console.log(
              `     - ${p.name}: ${p.stripePriceId || 'não configurado'}`,
            )
            if (p.stripePriceId === priceId) {
              console.log('       ✅ CORRESPONDÊNCIA ENCONTRADA!')
            }
          }

          const plan = await prisma.plan.findFirst({
            where: {
              stripePriceId: priceId,
            },
          })

          if (!plan) {
            console.error('❌ [webhook] Plan not found for priceId:', priceId)
            console.error(
              '   Verifique se o stripePriceId do plano está correto no banco',
            )
            console.error('   Price ID recebido do Stripe:', priceId)
            console.error('   Price IDs disponíveis no banco (listados acima)')
            return reply.status(200).send({ received: true })
          }

          console.log(
            '✅ [webhook] Plan encontrado:',
            plan.name,
            `(${plan.id})`,
          )

          // Obter current_period_end (pode estar no item para billing_mode: flexible)
          let currentPeriodEndTimestamp: number | undefined =
            subscription.current_period_end

          if (!currentPeriodEndTimestamp) {
            // Tentar pegar do subscription item (para billing_mode: flexible)
            const firstItem = subscription.items?.data?.[0]
            const itemPeriodEnd = (
              firstItem as { current_period_end?: number } | undefined
            )?.current_period_end

            if (itemPeriodEnd && typeof itemPeriodEnd === 'number') {
              currentPeriodEndTimestamp = itemPeriodEnd
              console.log(
                'ℹ️ [webhook] Usando current_period_end do subscription item',
              )
            }
          }

          if (!currentPeriodEndTimestamp || typeof currentPeriodEndTimestamp !== 'number') {
            console.error(
              '❌ [webhook] current_period_end não encontrado na subscription',
            )
            return reply.status(200).send({ received: true })
          }

          // Criar ou atualizar subscription
          const currentPeriodEnd = new Date(
            currentPeriodEndTimestamp * 1000,
          )
          
          // Verificar se a subscription foi cancelada mas ainda está ativa até o fim do período
          const cancelAtPeriodEnd = (subscription as Stripe.Subscription & {
            cancel_at_period_end?: boolean
          }).cancel_at_period_end
          
          // Determinar status: se cancel_at_period_end é true, manter como 'active' até o período terminar
          // O sistema automaticamente usará FREE quando currentPeriodEnd expirar
          let status: string
          if (cancelAtPeriodEnd && (subscription.status === 'active' || subscription.status === 'trialing')) {
            // Subscription cancelada mas ainda ativa até o fim do período
            status = 'active'
            console.log('ℹ️ [webhook] Subscription cancelada mas ativa até:', currentPeriodEnd.toISOString())
          } else {
            status =
              subscription.status === 'active' ||
              subscription.status === 'trialing'
                ? 'active'
                : subscription.status === 'past_due'
                  ? 'past_due'
                  : 'canceled'
          }

          console.log('🔍 [webhook] Buscando subscription existente...')
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
            console.log(
              '🔄 [webhook] Atualizando subscription existente:',
              existingSubscription.id,
            )
            await prisma.subscription.update({
              where: { id: existingSubscription.id },
              data: {
                planId: plan.id,
                status,
                currentPeriodEnd,
                stripeSubscriptionId: subscription.id,
              },
            })
            console.log(
              '✅ [webhook] Subscription atualizada:',
              existingSubscription.id,
            )
          } else {
            console.log('➕ [webhook] Criando nova subscription...')
            const newSubscription = await prisma.subscription.create({
              data: {
                userId: user.id,
                planId: plan.id,
                status,
                currentPeriodEnd,
                stripeSubscriptionId: subscription.id,
              },
            })
            console.log('✅ [webhook] Subscription criada:', newSubscription.id)
          }

          console.log(
            '✅ [webhook] Subscription processada com sucesso:',
            subscription.id,
          )
        } catch (error) {
          console.error(
            '❌ [webhook] Erro ao processar customer.subscription.created/updated:',
            error,
          )
          console.error(
            '   Stack:',
            error instanceof Error ? error.stack : 'N/A',
          )
          // Não retornar erro 500, senão o Stripe vai continuar tentando
          // Retornar 200 para evitar retentativas infinitas
          return reply.status(200).send({
            received: true,
            error: 'Processing failed but acknowledged',
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data
          .object as import('stripe').Stripe.Subscription

        // Buscar usuário pelo customerId
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : null
        const user = customerId
          ? await prisma.user.findFirst({
              where: { stripeCustomerId: customerId },
            })
          : null

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
        const invoice = event.data.object as import('stripe').Stripe.Invoice & {
          subscription?: string | { id: string } | null
        }

        const subscriptionId =
          typeof invoice.subscription === 'string'
            ? invoice.subscription
            : invoice.subscription?.id

        if (subscriptionId) {
          const subscription = (await stripe.subscriptions.retrieve(
            subscriptionId,
          )) as Stripe.Subscription

          const user = await prisma.user.findFirst({
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
                  (
                    subscription as Stripe.Subscription & {
                      current_period_end: number
                    }
                  ).current_period_end * 1000,
                ),
              },
            })

            console.log('✅ Payment succeeded, subscription activated')
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as import('stripe').Stripe.Invoice & {
          subscription?: string | { id: string } | null
        }

        const subscriptionId =
          typeof invoice.subscription === 'string'
            ? invoice.subscription
            : invoice.subscription?.id

        if (subscriptionId) {
          const subscription = (await stripe.subscriptions.retrieve(
            subscriptionId,
          )) as Stripe.Subscription

          const user = await prisma.user.findFirst({
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
        console.log(`ℹ️ [webhook] Evento não processado: ${event.type}`)
    }

    console.log('✅ [webhook] Evento processado com sucesso:', event.type)
    return reply.status(200).send({ received: true })
  } catch (error) {
    console.error('❌ [webhook] Error processing webhook:', error)
    console.error('   Event type:', event?.type)
    console.error(
      '   Error details:',
      error instanceof Error ? error.message : error,
    )
    console.error('   Stack:', error instanceof Error ? error.stack : 'N/A')

    // Retornar 500 apenas para erros inesperados (ex: erro de conexão com banco)
    // Erros de lógica (usuário não encontrado, etc) já retornam 200 dentro dos cases
    return reply.status(500).send({
      message: 'Webhook processing failed',
      eventType: event?.type,
    })
  }
}
