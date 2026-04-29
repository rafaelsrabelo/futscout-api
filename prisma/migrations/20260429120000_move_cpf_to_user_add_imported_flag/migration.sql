-- Migration: move cpf de athlete_profiles e observer_profiles para users + adicionar isImported
-- Estratégia: adiciona colunas nullable em users → backfill a partir dos perfis →
-- marca todos os usuários atuais como isImported=true → deduplica CPFs (mantém o mais
-- antigo, zera nos demais) → cria unique index → dropa colunas antigas.

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

-- 5. Deduplicação: o script de import criou alguns usuários duplicados com mesmo CPF.
--    Mantemos o cpf no registro mais antigo (createdAt ASC) e zeramos nos demais.
--    Os duplicados ficam sem CPF mas continuam acessíveis via email/senha — o time
--    operacional resolve manualmente depois.
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY "cpf"
           ORDER BY "createdAt" ASC, id ASC
         ) AS rn
  FROM "users"
  WHERE "cpf" IS NOT NULL
)
UPDATE "users" u
SET "cpf" = NULL
FROM duplicates d
WHERE u.id = d.id AND d.rn > 1;

-- 6. Unique index em users.cpf (NULLs são tratados como distintos pelo Postgres)
CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");

-- 7. Drop cpf das tabelas de perfil (índices únicos antigos caem junto)
DROP INDEX IF EXISTS "athlete_profiles_cpf_key";
ALTER TABLE "athlete_profiles" DROP COLUMN "cpf";

DROP INDEX IF EXISTS "observer_profiles_cpf_key";
ALTER TABLE "observer_profiles" DROP COLUMN "cpf";
