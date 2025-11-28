-- ✅ SQL ALTERNATIVO (sem aspas nas colunas)
-- Execute no Render Database

UPDATE plans
SET stripePriceId = 'price_1SXnFDLW3iRz1CdXgfDhRNsQ'
WHERE name = 'PREMIUM';

-- Verificar
SELECT id, name, price, stripePriceId FROM plans WHERE name = 'PREMIUM';

