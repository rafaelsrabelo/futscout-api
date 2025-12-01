-- Script template para fazer UPSERT (insert ou update) de subscription
-- Use este script quando você tiver os dados do Stripe

-- PASSO 1: Encontrar o planId do PREMIUM
-- Execute esta query primeiro:
SELECT id, name, "stripePriceId" 
FROM plans 
WHERE name = 'PREMIUM';

-- PASSO 2: Encontrar o userId pelo email ou stripeCustomerId
-- Por email:
SELECT id, email, "stripeCustomerId" 
FROM users 
WHERE email = 'email@usuario.com';

-- Por stripeCustomerId:
SELECT id, email, "stripeCustomerId" 
FROM users 
WHERE "stripeCustomerId" = 'cus_xxxxx';

-- PASSO 3: Fazer UPSERT da subscription
-- Substitua os valores marcados com <<>>

WITH plan_data AS (
    SELECT id as plan_id 
    FROM plans 
    WHERE name = 'PREMIUM'
    LIMIT 1
),
user_data AS (
    SELECT id as user_id 
    FROM users 
    WHERE "stripeCustomerId" = '<<STRIPE_CUSTOMER_ID>>' -- Exemplo: 'cus_TVHvHhqsnhbbSr'
    LIMIT 1
)
INSERT INTO subscriptions (
    id,
    "userId",
    "planId",
    status,
    "currentPeriodEnd",
    "stripeSubscriptionId",
    "createdAt"
)
SELECT 
    COALESCE(
        (SELECT id FROM subscriptions WHERE "userId" = user_data.user_id LIMIT 1),
        gen_random_uuid()
    ),
    user_data.user_id,
    plan_data.plan_id,
    'active',
    '<<CURRENT_PERIOD_END>>'::timestamp, -- Exemplo: '2025-12-31 23:59:59'
    '<<STRIPE_SUBSCRIPTION_ID>>', -- Exemplo: 'sub_1SZbZ8LW3iRz1CdX'
    COALESCE(
        (SELECT "createdAt" FROM subscriptions WHERE "userId" = user_data.user_id LIMIT 1),
        NOW()
    )
FROM plan_data, user_data
ON CONFLICT ("userId") 
DO UPDATE SET
    "planId" = EXCLUDED."planId",
    status = EXCLUDED.status,
    "currentPeriodEnd" = EXCLUDED."currentPeriodEnd",
    "stripeSubscriptionId" = EXCLUDED."stripeSubscriptionId";

-- Exemplo completo (substitua os valores):
/*
WITH plan_data AS (
    SELECT id as plan_id 
    FROM plans 
    WHERE name = 'PREMIUM'
    LIMIT 1
),
user_data AS (
    SELECT id as user_id 
    FROM users 
    WHERE "stripeCustomerId" = 'cus_TVHvHhqsnhbbSr'
    LIMIT 1
)
INSERT INTO subscriptions (
    id,
    "userId",
    "planId",
    status,
    "currentPeriodEnd",
    "stripeSubscriptionId",
    "createdAt"
)
SELECT 
    COALESCE(
        (SELECT id FROM subscriptions WHERE "userId" = user_data.user_id LIMIT 1),
        gen_random_uuid()
    ),
    user_data.user_id,
    plan_data.plan_id,
    'active',
    '2025-12-31 23:59:59'::timestamp,
    'sub_1SZbZ8LW3iRz1CdX',
    COALESCE(
        (SELECT "createdAt" FROM subscriptions WHERE "userId" = user_data.user_id LIMIT 1),
        NOW()
    )
FROM plan_data, user_data
ON CONFLICT ("userId") 
DO UPDATE SET
    "planId" = EXCLUDED."planId",
    status = EXCLUDED.status,
    "currentPeriodEnd" = EXCLUDED."currentPeriodEnd",
    "stripeSubscriptionId" = EXCLUDED."stripeSubscriptionId";
*/

