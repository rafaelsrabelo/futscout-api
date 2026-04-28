-- AlterTable: tornar campos opcionais no AthleteProfile
ALTER TABLE "athlete_profiles" ALTER COLUMN "gender" DROP NOT NULL;
ALTER TABLE "athlete_profiles" ALTER COLUMN "birthDate" DROP NOT NULL;
ALTER TABLE "athlete_profiles" ALTER COLUMN "height" DROP NOT NULL;
ALTER TABLE "athlete_profiles" ALTER COLUMN "weight" DROP NOT NULL;
ALTER TABLE "athlete_profiles" ALTER COLUMN "dominantFoot" DROP NOT NULL;
ALTER TABLE "athlete_profiles" ALTER COLUMN "primaryPosition" DROP NOT NULL;

-- CreateTable: histórico de importações
CREATE TABLE "import_logs" (
    "id" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "created" INTEGER NOT NULL,
    "updated" INTEGER NOT NULL,
    "errorCount" INTEGER NOT NULL,
    "errors" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_logs_pkey" PRIMARY KEY ("id")
);
