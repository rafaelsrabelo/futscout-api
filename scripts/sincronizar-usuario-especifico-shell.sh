#!/bin/bash
# Script para sincronizar um usuário específico pelo user_id
# Uso: ./sincronizar-usuario-especifico-shell.sh <user_id>

USER_ID=$1

if [ -z "$USER_ID" ]; then
  echo "❌ Erro: User ID não fornecido!"
  echo ""
  echo "📖 Como usar:"
  echo "   ./sincronizar-usuario-especifico-shell.sh <user_id>"
  echo ""
  echo "💡 O user_id está no token JWT (campo 'sub')"
  exit 1
fi

cd /opt/render/project/src && npx tsx -e "
import { PrismaClient } from './generated/prisma/index.js';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2025-11-17.clover' });

(async () => {
  try {
    const userId = '$USER_ID';
    console.log('🔍 Buscando usuário:', userId);
    
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      select: { id: true, email: true, name: true, stripeCustomerId: true }
    });
    
    if (!user) {
      console.error('❌ Usuário não encontrado');
      process.exit(1);
    }
    
    console.log('👤 Usuário encontrado:');
    console.log('   Email:', user.email);
    console.log('   Nome:', user.name);
    console.log('   Stripe Customer ID:', user.stripeCustomerId || 'não configurado');
    
    if (!user.stripeCustomerId) {
      console.error('❌ Usuário não tem stripeCustomerId configurado');
      console.error('💡 O usuário precisa ter feito checkout pelo menos uma vez');
      process.exit(1);
    }
    
    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    const isLiveMode = stripeKey.startsWith('sk_live_');
    console.log('🌍 Ambiente Stripe:', isLiveMode ? 'PRODUÇÃO' : 'TEST');
    console.log('🔍 Buscando subscriptions no Stripe...\n');
    
    const subs = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'active',
      limit: 10
    });
    
    console.log('📋 Encontradas', subs.data.length, 'subscription(s) ativa(s)\n');
    
    if (subs.data.length === 0) {
      console.log('ℹ️ Nenhuma subscription ativa encontrada no Stripe');
      console.log('💡 Verifique se você realmente completou o pagamento');
      process.exit(0);
    }
    
    const sub = subs.data.sort((a, b) => b.created - a.created)[0];
    console.log('📦 Subscription encontrada:', sub.id);
    console.log('   Status:', sub.status);
    console.log('   Ambiente:', sub.livemode ? 'PRODUÇÃO' : 'TEST');
    console.log('   Criada em:', new Date(sub.created * 1000).toISOString());
    
    if (isLiveMode && !sub.livemode) {
      console.warn('⚠️ ATENÇÃO: Subscription está em TEST mas você está usando chave de PRODUÇÃO!');
      process.exit(1);
    } else if (!isLiveMode && sub.livemode) {
      console.warn('⚠️ ATENÇÃO: Subscription está em PRODUCTION mas você está usando chave de TEST!');
      process.exit(1);
    }
    
    const priceId = sub.items.data[0]?.price?.id;
    if (!priceId) {
      console.error('❌ PriceId não encontrado na subscription');
      process.exit(1);
    }
    
    console.log('   Price ID:', priceId);
    
    const plan = await prisma.plan.findFirst({ where: { stripePriceId: priceId } });
    if (!plan) {
      console.error('❌ Plano não encontrado para priceId:', priceId);
      console.error('💡 O priceId da subscription não corresponde a nenhum plano no banco');
      console.error('💡 Verifique se o stripePriceId do plano está correto');
      process.exit(1);
    }
    
    console.log('✅ Plano encontrado:', plan.name);
    
    const currentPeriodEnd = new Date(sub.current_period_end * 1000);
    const status = sub.status === 'active' ? 'active' : sub.status === 'past_due' ? 'past_due' : 'canceled';
    
    const existing = await prisma.subscription.findFirst({
      where: { OR: [{ stripeSubscriptionId: sub.id }, { userId: user.id }] }
    });
    
    if (existing) {
      await prisma.subscription.update({
        where: { id: existing.id },
        data: { planId: plan.id, status, currentPeriodEnd, stripeSubscriptionId: sub.id }
      });
      console.log('✅ Subscription atualizada:', existing.id);
      console.log('   Plano:', plan.name);
      console.log('   Status:', status);
      console.log('   Válida até:', currentPeriodEnd.toISOString());
    } else {
      const newSub = await prisma.subscription.create({
        data: { userId: user.id, planId: plan.id, status, currentPeriodEnd, stripeSubscriptionId: sub.id },
        include: { plan: true }
      });
      console.log('✅ Subscription criada:', newSub.id);
      console.log('   Plano:', newSub.plan.name);
      console.log('   Status:', status);
      console.log('   Válida até:', currentPeriodEnd.toISOString());
    }
    
    console.log('\n✅ Sincronização concluída!');
    console.log('💡 Agora o frontend deve mostrar o plano PREMIUM');
  } catch (error) {
    console.error('❌ Erro:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  } finally {
    await prisma.\$disconnect();
  }
})();
"

