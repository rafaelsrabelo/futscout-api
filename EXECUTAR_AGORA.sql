-- ✅ EXECUTE ESTE SQL NO RENDER DATABASE AGORA
-- Price ID: price_1SXnFDLW3iRz1CdXgfDhRNsQ

UPDATE plans 
SET "stripePriceId" = 'price_1SXnFDLW3iRz1CdXgfDhRNsQ'
WHERE name = 'PREMIUM';

-- Verificar resultado
SELECT id, name, price, "stripePriceId" 
FROM plans 
WHERE name = 'PREMIUM';

