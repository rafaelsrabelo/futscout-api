-- Script para inserir/atualizar subscription manualmente
-- Use este script quando você já tiver os dados do Stripe (subscription ID, price ID, etc)

-- IMPORTANTE: Substitua os valores entre <<>> pelos dados reais do Stripe

-- 1. Primeiro, encontre o planId baseado no stripePriceId
-- Execute esta query para ver os planos disponíveis:
SELECT id, name, "stripePriceId" FROM plans;

-- 2. Depois, insira ou atualize a subscription
-- Substitua os valores:
-- <<USER_ID>> = ID do usuário (UUID)
-- <<PLAN_ID>> = ID do plano PREMIUM (UUID) - obtido da query acima
-- <<STRIPE_SUBSCRIPTION_ID>> = ID da subscription no Stripe (ex: sub_xxxxx)
-- <<CURRENT_PERIOD_END>> = Data de término do período atual (formato: '2025-12-31 23:59:59')
-- <<STATUS>> = 'active', 'past_due' ou 'canceled'

-- Exemplo de INSERT (se não existe subscription):
INSERT INTO subscriptions (
    id,
    "userId",
    "planId",
    status,
    "currentPeriodEnd",
    "stripeSubscriptionId",
    "createdAt"
)
VALUES (
    gen_random_uuid(), -- Gera um novo UUID
    '<<USER_ID>>', -- Exemplo: 'da037682-f58f-4b0b-afba-f7ec12b9ebf8'
    '<<PLAN_ID>>', -- Exemplo: '0d32152f-e130-4368-9b97-51c6f6cb3f73'
    'active',
    '<<CURRENT_PERIOD_END>>'::timestamp, -- Exemplo: '2025-12-31 23:59:59'
    '<<STRIPE_SUBSCRIPTION_ID>>', -- Exemplo: 'sub_1SZbZ8LW3iRz1CdX'
    NOW()
)
ON CONFLICT DO NOTHING;

-- Exemplo de UPDATE (se já existe subscription):
UPDATE subscriptions
SET 
    "planId" = '<<PLAN_ID>>',
    status = 'active',
    "currentPeriodEnd" = '<<CURRENT_PERIOD_END>>'::timestamp,
    "stripeSubscriptionId" = '<<STRIPE_SUBSCRIPTION_ID>>'
WHERE 
    "userId" = '<<USER_ID>>'
    OR "stripeSubscriptionId" = '<<STRIPE_SUBSCRIPTION_ID>>';

-- Exemplo completo (substitua os valores):
/*
INSERT INTO subscriptions (
    id,
    "userId",
    "planId",
    status,
    "currentPeriodEnd",
    "stripeSubscriptionId",
    "createdAt"
)
VALUES (
    gen_random_uuid(),
    'da037682-f58f-4b0b-afba-f7ec12b9ebf8', -- USER_ID
    '0d32152f-e130-4368-9b97-51c6f6cb3f73', -- PLAN_ID (PREMIUM)
    'active',
    '2025-12-31 23:59:59'::timestamp, -- CURRENT_PERIOD_END
    'sub_1SZbZ8LW3iRz1CdX', -- STRIPE_SUBSCRIPTION_ID
    NOW()
)
ON CONFLICT DO NOTHING;
*/

