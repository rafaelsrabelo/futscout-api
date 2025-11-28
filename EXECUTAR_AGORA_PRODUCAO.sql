-- ✅ EXECUTE ESTE SQL NO RENDER DATABASE AGORA
-- 
-- Passo 1: Obter o Price ID do Stripe
--   1. Acesse: https://dashboard.stripe.com/products
--   2. Clique em "Futscore Premium - Mensal"
--   3. Clique no preço "R$ 29,90 Por mês"
--   4. Copie o Price ID (começa com price_)
--   5. Substitua 'price_xxxxx' abaixo pelo Price ID real

-- Criar plano FREE
INSERT INTO plans (id, name, price, currency, "monthlyLimitMatches", "monthlyLimitVideos", "monthlyLimitStandaloneVideos", "isUnlimited", "createdAt")
VALUES (
  gen_random_uuid(),
  'FREE',
  0,
  'BRL',
  5,
  NULL,
  5,
  false,
  NOW()
)
ON CONFLICT (name) DO NOTHING;

-- Criar plano PREMIUM
-- ⚠️ SUBSTITUA 'price_xxxxx' pelo Price ID real do Stripe
INSERT INTO plans (id, name, price, currency, "monthlyLimitMatches", "monthlyLimitVideos", "monthlyLimitStandaloneVideos", "isUnlimited", "stripePriceId", "createdAt")
VALUES (
  gen_random_uuid(),
  'PREMIUM',
  2990,
  'BRL',
  NULL,
  NULL,
  NULL,
  true,
  'price_xxxxx',  -- ⚠️ SUBSTITUA pelo Price ID real
  NOW()
)
ON CONFLICT (name) DO NOTHING;

-- Verificar se foram criados
SELECT id, name, price, "stripePriceId" FROM plans ORDER BY price;

