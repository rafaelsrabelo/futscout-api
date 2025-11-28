-- ✅ EXECUTE ESTE SQL NO RENDER DATABASE
-- Price ID do Stripe: price_1SXnFDLW3iRz1CdXgfDhRNsQ

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
ON CONFLICT (name) DO UPDATE SET
  "monthlyLimitMatches" = 5,
  "monthlyLimitVideos" = NULL,
  "monthlyLimitStandaloneVideos" = 5;

-- Criar plano PREMIUM
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
  'price_1SXnFDLW3iRz1CdXgfDhRNsQ',
  NOW()
)
ON CONFLICT (name) DO UPDATE SET
  "stripePriceId" = 'price_1SXnFDLW3iRz1CdXgfDhRNsQ';

-- Verificar se foram criados
SELECT id, name, price, "stripePriceId" FROM plans ORDER BY price;

