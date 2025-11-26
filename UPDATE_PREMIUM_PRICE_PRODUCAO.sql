-- Script SQL para atualizar o stripePriceId do plano PREMIUM em produção
-- 
-- Price ID: price_1SXnFDLW3iRz1CdXgfDhRNsQ
-- Data: 26/11/2025

UPDATE plans 
SET "stripePriceId" = 'price_1SXnFDLW3iRz1CdXgfDhRNsQ'
WHERE name = 'PREMIUM';

-- Verificar se atualizou corretamente
SELECT id, name, price, "stripePriceId" 
FROM plans 
WHERE name = 'PREMIUM';

