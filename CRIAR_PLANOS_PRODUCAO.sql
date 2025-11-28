-- ⚠️ ATENÇÃO: Execute este SQL no Render Database (Produção)
-- 
-- Este script cria os planos FREE e PREMIUM no banco de produção
-- 
-- INSTRUÇÕES:
-- 1. Acesse Render Dashboard → Database → Connect
-- 2. Execute este SQL
-- 3. Verifique se os planos foram criados

-- Verificar se planos já existem
SELECT id, name FROM plans;

-- Criar plano FREE (se não existir)
INSERT INTO plans (id, name, price, currency, "monthlyLimitMatches", "monthlyLimitVideos", "monthlyLimitStandaloneVideos", "isUnlimited", "createdAt")
SELECT 
  gen_random_uuid(),
  'FREE',
  0,
  'BRL',
  5,
  NULL,
  5,
  false,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM plans WHERE name = 'FREE'
);

-- Criar plano PREMIUM (se não existir)
-- ⚠️ IMPORTANTE: Substitua 'price_1SXnFDLW3iRz1CdXgfDhRNsQ' pelo Price ID real do seu produto no Stripe
INSERT INTO plans (id, name, price, currency, "monthlyLimitMatches", "monthlyLimitVideos", "monthlyLimitStandaloneVideos", "isUnlimited", "stripePriceId", "createdAt")
SELECT 
  gen_random_uuid(),
  'PREMIUM',
  2990,
  'BRL',
  NULL,
  NULL,
  NULL,
  true,
  'price_1SXnFDLW3iRz1CdXgfDhRNsQ',  -- ⚠️ SUBSTITUA pelo Price ID real do Stripe
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM plans WHERE name = 'PREMIUM'
);

-- Verificar se foram criados
SELECT id, name, price, "stripePriceId" FROM plans ORDER BY price;

