/*
  Warnings:

  - You are about to drop the column `myTeam` on the `matches` table. All the data in the column will be lost.
  - Added the required column `myTeamId` to the `matches` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `teams` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('CURRENT', 'FORMER');

-- CreateEnum
CREATE TYPE "PlayerPositionType" AS ENUM ('GOALKEEPER', 'RIGHT_BACK', 'LEFT_BACK', 'CENTER_BACK', 'DEFENSIVE_MIDFIELDER', 'CENTRAL_MIDFIELDER', 'ATTACKING_MIDFIELDER', 'RIGHT_WINGER', 'LEFT_WINGER', 'STRIKER', 'CENTER_FORWARD');

-- Step 1: Add new columns as nullable first
-- AlterTable
ALTER TABLE "teams" ADD COLUMN "userId" TEXT;

-- Step 2: Add myTeamId as nullable
ALTER TABLE "matches" ADD COLUMN "myTeamId" TEXT;

-- Step 3: For existing matches, create teams from myTeam strings and link them
-- This requires getting the user from athlete profile through the match
DO $$
DECLARE
    match_record RECORD;
    team_id TEXT;
    user_id TEXT;
BEGIN
    FOR match_record IN SELECT m.id, m."myTeam", ap."userId" 
                       FROM matches m 
                       JOIN athlete_profiles ap ON ap.id = m."athleteId"
                       WHERE m."myTeam" IS NOT NULL
    LOOP
        -- Get or create team for this user
        SELECT id INTO team_id 
        FROM teams 
        WHERE name = match_record."myTeam" AND "userId" = match_record."userId";
        
        IF team_id IS NULL THEN
            -- Create new team
            INSERT INTO teams (id, name, acronym, category, "userId", "createdAt", "updatedAt")
            VALUES (
                gen_random_uuid()::text,
                match_record."myTeam",
                UPPER(LEFT(match_record."myTeam", 3)),
                'AMATEUR',
                match_record."userId",
                NOW(),
                NOW()
            )
            RETURNING id INTO team_id;
        END IF;
        
        -- Update match with team id
        UPDATE matches 
        SET "myTeamId" = team_id 
        WHERE id = match_record.id;
    END LOOP;
END $$;

-- Step 4: Set default userId for existing teams (use first user as fallback)
UPDATE teams 
SET "userId" = (SELECT id FROM users ORDER BY "createdAt" LIMIT 1)
WHERE "userId" IS NULL;

-- Step 5: Now make the columns required
ALTER TABLE "teams" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "matches" ALTER COLUMN "myTeamId" SET NOT NULL;

-- Step 6: Drop the old myTeam column
ALTER TABLE "matches" DROP COLUMN "myTeam";

-- CreateTable
CREATE TABLE "team_history" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "status" "TeamStatus" NOT NULL,
    "position" "PlayerPositionType",
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "league" TEXT,
    "category" "Category",
    "achievements" TEXT,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_history_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "team_history" ADD CONSTRAINT "team_history_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athlete_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_history" ADD CONSTRAINT "team_history_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_myTeamId_fkey" FOREIGN KEY ("myTeamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
