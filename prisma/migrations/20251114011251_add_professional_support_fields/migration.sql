-- AlterTable
ALTER TABLE "addresses" ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'Brasil';

-- AlterTable
ALTER TABLE "athlete_profiles" ADD COLUMN     "hasNutritionist" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasPersonalTrainer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasPsychologist" BOOLEAN NOT NULL DEFAULT false;
