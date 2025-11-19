-- AlterTable
ALTER TABLE "plays" ADD COLUMN     "athleteId" TEXT,
ALTER COLUMN "matchId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "plays" ADD CONSTRAINT "plays_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athlete_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
