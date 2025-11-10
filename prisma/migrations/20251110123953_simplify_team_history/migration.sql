/*
  Warnings:

  - You are about to drop the column `achievements` on the `team_history` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `team_history` table. All the data in the column will be lost.
  - You are about to drop the column `league` on the `team_history` table. All the data in the column will be lost.
  - You are about to drop the column `observations` on the `team_history` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `team_history` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `team_history` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "team_history" DROP COLUMN "achievements",
DROP COLUMN "category",
DROP COLUMN "league",
DROP COLUMN "observations",
DROP COLUMN "position",
DROP COLUMN "status";

-- DropEnum
DROP TYPE "public"."PlayerPositionType";

-- DropEnum
DROP TYPE "public"."TeamStatus";
