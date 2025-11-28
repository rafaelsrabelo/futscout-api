-- ✅ SQL CORRIGIDO - Execute no Render Database
-- Atualizar plano PREMIUM com Stripe Price ID

UPDATE plans
SET "stripePriceId" = 'price_1SXnFDLW3iRz1CdXgfDhRNsQ'
WHERE name = 'PREMIUM';

-- Verificar se foi atualizado
SELECT id, name, price, "stripePriceId" FROM plans WHERE name = 'PREMIUM';

