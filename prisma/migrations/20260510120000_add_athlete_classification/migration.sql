-- Migration: classificação interna do atleta (admin define).
-- null = não classificado. Novos valores podem ser adicionados no futuro.
-- O campo em athlete_profiles é o snapshot do último registro do log;
-- athlete_classification_logs guarda o histórico completo.

CREATE TYPE "AthleteClassification" AS ENUM ('DESENVOLVIMENTO', 'PERFORMANCE');

ALTER TABLE "athlete_profiles" ADD COLUMN "classification" "AthleteClassification";

CREATE TABLE "athlete_classification_logs" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "classification" "AthleteClassification",
    "comment" TEXT,
    "classifiedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "athlete_classification_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "athlete_classification_logs_athleteId_createdAt_idx"
  ON "athlete_classification_logs" ("athleteId", "createdAt" DESC);

ALTER TABLE "athlete_classification_logs"
  ADD CONSTRAINT "athlete_classification_logs_athleteId_fkey"
  FOREIGN KEY ("athleteId") REFERENCES "athlete_profiles" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "athlete_classification_logs"
  ADD CONSTRAINT "athlete_classification_logs_classifiedById_fkey"
  FOREIGN KEY ("classifiedById") REFERENCES "users" ("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
