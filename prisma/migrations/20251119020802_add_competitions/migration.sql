-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "competitionId" TEXT;

-- CreateTable
CREATE TABLE "competitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "location" TEXT,
    "modality" "Modality",
    "category" "Category",
    "athleteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athlete_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
