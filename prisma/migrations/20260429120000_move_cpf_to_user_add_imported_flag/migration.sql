-- Migration: move cpf de athlete_profiles e observer_profiles para users + adicionar isImported
-- Estratégia: adiciona colunas nullable em users → backfill a partir dos perfis →
-- marca todos os usuários atuais como isImported=true → drop colunas dos perfis.

-- 1. Novas colunas em users
ALTER TABLE "users" ADD COLUMN "cpf" TEXT;
ALTER TABLE "users" ADD COLUMN "isImported" BOOLEAN NOT NULL DEFAULT false;

-- 2. Backfill cpf a partir de athlete_profiles
UPDATE "users"
SET "cpf" = ap."cpf"
FROM "athlete_profiles" ap
WHERE "users"."id" = ap."userId"
  AND "users"."cpf" IS NULL;

-- 3. Backfill cpf a partir de observer_profiles
UPDATE "users"
SET "cpf" = op."cpf"
FROM "observer_profiles" op
WHERE "users"."id" = op."userId"
  AND "users"."cpf" IS NULL;

-- 4. Marca todos os usuários existentes como importados — register pode reativá-los.
--    Cadastros novos via /auth/users entrarão com isImported=false.
UPDATE "users" SET "isImported" = true;

-- 5. Unique index em users.cpf
CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");

-- 6. Drop cpf das tabelas de perfil (índices únicos antigos caem junto)
DROP INDEX IF EXISTS "athlete_profiles_cpf_key";
ALTER TABLE "athlete_profiles" DROP COLUMN "cpf";

DROP INDEX IF EXISTS "observer_profiles_cpf_key";
ALTER TABLE "observer_profiles" DROP COLUMN "cpf";
