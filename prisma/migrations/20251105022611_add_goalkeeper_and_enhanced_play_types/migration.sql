-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PlayType" ADD VALUE 'PENALTY_SAVE';
ALTER TYPE "PlayType" ADD VALUE 'ONE_ON_ONE_SAVE';
ALTER TYPE "PlayType" ADD VALUE 'REFLEX_SAVE';
ALTER TYPE "PlayType" ADD VALUE 'DIVING_SAVE';
ALTER TYPE "PlayType" ADD VALUE 'CATCH';
ALTER TYPE "PlayType" ADD VALUE 'PUNCH';
ALTER TYPE "PlayType" ADD VALUE 'DISTRIBUTION';
ALTER TYPE "PlayType" ADD VALUE 'GOAL_KICK';
ALTER TYPE "PlayType" ADD VALUE 'THROW_OUT';
ALTER TYPE "PlayType" ADD VALUE 'SHOT_BLOCKED';
ALTER TYPE "PlayType" ADD VALUE 'CLEARANCE';
ALTER TYPE "PlayType" ADD VALUE 'OFFENSIVE_FOUL';
ALTER TYPE "PlayType" ADD VALUE 'DEFENSIVE_FOUL';
ALTER TYPE "PlayType" ADD VALUE 'BALL_RECOVERY';
ALTER TYPE "PlayType" ADD VALUE 'THROUGH_PASS';
ALTER TYPE "PlayType" ADD VALUE 'BACKHEEL';
ALTER TYPE "PlayType" ADD VALUE 'VOLLLEY';
ALTER TYPE "PlayType" ADD VALUE 'BICYCLE_KICK';
ALTER TYPE "PlayType" ADD VALUE 'OFFSIDE';
ALTER TYPE "PlayType" ADD VALUE 'MISSED_SHOT';
ALTER TYPE "PlayType" ADD VALUE 'SHOT_ON_TARGET';
ALTER TYPE "PlayType" ADD VALUE 'SHOT_OFF_TARGET';
