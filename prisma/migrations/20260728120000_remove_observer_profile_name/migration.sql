-- O nome do observador passa a viver apenas em `users.name` (definido no cadastro).
-- Antes desta migration o PUT /observer/profile gravava só em `observer_profiles.name`,
-- sem sincronizar `users.name` — então o nome mais recente pode estar na coluna que
-- vamos remover. Backfill preserva essa edição antes do DROP.
UPDATE "users"
SET "name" = "observer_profiles"."name"
FROM "observer_profiles"
WHERE "users"."id" = "observer_profiles"."userId"
  AND btrim("observer_profiles"."name") <> ''
  AND "observer_profiles"."name" <> "users"."name";

ALTER TABLE "observer_profiles" DROP COLUMN "name";
