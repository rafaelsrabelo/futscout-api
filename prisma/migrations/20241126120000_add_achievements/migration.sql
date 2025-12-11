-- CreateEnum
CREATE TYPE "AchievementType" AS ENUM ('COLLECTIVE', 'INDIVIDUAL');

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "type" "AchievementType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athlete_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

