-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'LIVE', 'FINISHED', 'CANCELLED');

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED';
