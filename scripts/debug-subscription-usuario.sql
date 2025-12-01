-- Script para debugar subscription de um usuário específico
-- Use o user_id do JWT token (sub field)

-- Substitua 'da037682-f58f-4b0b-afba-f7ec12b9ebf8' pelo user_id do token
WITH user_info AS (
    SELECT 
        id,
        email,
        name,
        "stripeCustomerId"
    FROM users
    WHERE id = 'da037682-f58f-4b0b-afba-f7ec12b9ebf8' -- USER_ID do token
)
SELECT 
    u.id as user_id,
    u.email,
    u."stripeCustomerId",
    s.id as subscription_id,
    s.status,
    s."currentPeriodEnd",
    NOW() as agora,
    s."currentPeriodEnd" < NOW() as esta_expirada,
    s."stripeSubscriptionId",
    p.name as plan_name,
    p."stripePriceId",
    -- Verificar se está válida
    CASE 
        WHEN s.id IS NULL THEN '❌ SEM SUBSCRIPTION'
        WHEN s."currentPeriodEnd" < NOW() THEN '❌ EXPIRADA'
        WHEN s."currentPeriodEnd" >= NOW() AND s.status = 'active' THEN '✅ VÁLIDA'
        WHEN s.status != 'active' THEN '⚠️ STATUS: ' || s.status
        ELSE '⚠️ SEM DATA'
    END as status_detalhado
FROM user_info u
LEFT JOIN subscriptions s ON u.id = s."userId"
LEFT JOIN plans p ON s."planId" = p.id;

-- Verificar TODAS as subscriptions deste usuário (mesmo expiradas)
SELECT 
    u.email,
    s.id as subscription_id,
    s.status,
    s."currentPeriodEnd",
    NOW() as agora,
    s."currentPeriodEnd" < NOW() as esta_expirada,
    s."stripeSubscriptionId",
    p.name as plan_name,
    CASE 
        WHEN s."currentPeriodEnd" < NOW() THEN 'EXPIRADA'
        WHEN s."currentPeriodEnd" >= NOW() THEN 'VÁLIDA'
        ELSE 'SEM DATA'
    END as status_periodo
FROM users u
LEFT JOIN subscriptions s ON u.id = s."userId"
LEFT JOIN plans p ON s."planId" = p.id
WHERE u.id = 'da037682-f58f-4b0b-afba-f7ec12b9ebf8' -- USER_ID do token
ORDER BY s."createdAt" DESC NULLS LAST;
