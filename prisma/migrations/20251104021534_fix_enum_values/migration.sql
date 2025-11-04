/*
  Warnings:

  - The values [SUB_9,SUB_11,SUB_13,SUB_15,SUB_17,SUB_20] on the enum `Category` will be removed. If these variants are still used in the database, this will fail.
  - The values [FOOTBALL_11,FOOTBALL_7,SOCIETY] on the enum `Modality` will be removed. If these variants are still used in the database, this will fail.
  - The values [SAVE,FOUL_SUFFERED] on the enum `PlayType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Category_new" AS ENUM ('U5', 'U6', 'U7', 'U8', 'U9', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U20', 'AMATEUR', 'PROFESSIONAL');
ALTER TABLE "teams" ALTER COLUMN "category" TYPE "Category_new" USING ("category"::text::"Category_new");
ALTER TABLE "matches" ALTER COLUMN "category" TYPE "Category_new" USING ("category"::text::"Category_new");
ALTER TYPE "Category" RENAME TO "Category_old";
ALTER TYPE "Category_new" RENAME TO "Category";
DROP TYPE "public"."Category_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "Modality_new" AS ENUM ('FUT_11', 'FUT_7', 'FUTSAL');
ALTER TABLE "matches" ALTER COLUMN "modality" TYPE "Modality_new" USING ("modality"::text::"Modality_new");
ALTER TYPE "Modality" RENAME TO "Modality_old";
ALTER TYPE "Modality_new" RENAME TO "Modality";
DROP TYPE "public"."Modality_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PlayType_new" AS ENUM ('GOAL', 'DIFFICULT_SAVE', 'EASY_SAVE', 'ASSIST', 'FOUL_COMMITTED', 'FOUL_RECEIVED', 'DRIBBLE', 'ANTICIPATION', 'LONG_PASS', 'FREE_KICK', 'YELLOW_CARD', 'RED_CARD', 'RIGHT_FOOT_SHOT', 'LEFT_FOOT_SHOT', 'HEADER', 'TACKLE', 'INTERCEPTION', 'CROSS', 'CORNER_KICK', 'PENALTY', 'PASS', 'KEY_PASS');
ALTER TABLE "plays" ALTER COLUMN "playType" TYPE "PlayType_new" USING ("playType"::text::"PlayType_new");
ALTER TYPE "PlayType" RENAME TO "PlayType_old";
ALTER TYPE "PlayType_new" RENAME TO "PlayType";
DROP TYPE "public"."PlayType_old";
COMMIT;
