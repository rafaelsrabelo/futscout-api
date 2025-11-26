-- Script SQL para atualizar o stripePriceId do plano PREMIUM
-- Execute este script quando o banco estiver rodando

UPDATE plans 
SET "stripePriceId" = 'price_1SXlnqL1d3Ap7XCDF0krnX7P' 
WHERE name = 'PREMIUM';

-- Verificar se foi atualizado
SELECT id, name, price, "stripePriceId" 
FROM plans 
WHERE name = 'PREMIUM';

