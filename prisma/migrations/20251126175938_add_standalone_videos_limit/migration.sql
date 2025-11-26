-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "monthlyLimitStandaloneVideos" INTEGER;

-- AlterTable
ALTER TABLE "usages" ADD COLUMN     "standaloneVideosUsed" INTEGER NOT NULL DEFAULT 0;
