-- ✅ ATUALIZAR PLANO PREMIUM COM STRIPE PRICE ID
-- Execute este SQL no Render Database

-- Atualizar plano PREMIUM existente com o Stripe Price ID
UPDATE plans
SET "stripePriceId" = 'price_1SXnFDLW3iRz1CdXgfDhRNsQ'
WHERE name = 'PREMIUM';

-- Verificar se foi atualizado
SELECT id, name, price, "stripePriceId" FROM plans WHERE name = 'PREMIUM';

