-- CreateEnum
CREATE TYPE "MatchResult" AS ENUM ('WIN', 'LOSS', 'DRAW', 'NOT_FINISHED');

-- CreateEnum
CREATE TYPE "Modality" AS ENUM ('FOOTBALL_11', 'FOOTBALL_7', 'FUTSAL', 'SOCIETY');

-- CreateEnum
CREATE TYPE "PlayerPosition" AS ENUM ('STARTER', 'SUBSTITUTE');

-- CreateEnum
CREATE TYPE "PlayType" AS ENUM ('GOAL', 'RIGHT_FOOT_SHOT', 'LEFT_FOOT_SHOT', 'HEADER', 'ASSIST', 'SAVE', 'TACKLE', 'INTERCEPTION', 'DRIBBLE', 'CROSS', 'FREE_KICK', 'CORNER_KICK', 'PENALTY', 'FOUL_COMMITTED', 'FOUL_SUFFERED', 'YELLOW_CARD', 'RED_CARD', 'PASS', 'KEY_PASS');

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "myTeam" TEXT NOT NULL,
    "adversaryTeam" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "modality" "Modality" NOT NULL,
    "category" "Category" NOT NULL,
    "location" TEXT NOT NULL,
    "streamUrl" TEXT,
    "result" "MatchResult" NOT NULL DEFAULT 'NOT_FINISHED',
    "myTeamScore" INTEGER,
    "adversaryScore" INTEGER,
    "playerPosition" "PlayerPosition" NOT NULL,
    "observations" TEXT,
    "approximateTime" INTEGER,
    "photoUrl" TEXT,
    "videoUrl" TEXT,
    "performanceRating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plays" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playType" "PlayType" NOT NULL,
    "videoUrl" TEXT,
    "photoUrl" TEXT,
    "rating" INTEGER,
    "approximateTime" INTEGER,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plays_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athlete_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plays" ADD CONSTRAINT "plays_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
