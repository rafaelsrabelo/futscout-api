-- CreateEnum
CREATE TYPE "PlayClassification" AS ENUM ('PHYSICAL', 'TACTICAL', 'MENTAL', 'TECHNICAL');

-- CreateTable
CREATE TABLE "play_classifications" (
    "id" TEXT NOT NULL,
    "playId" TEXT NOT NULL,
    "classification" "PlayClassification" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "play_classifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "play_classifications_playId_classification_key" ON "play_classifications"("playId", "classification");

-- AddForeignKey
ALTER TABLE "play_classifications" ADD CONSTRAINT "play_classifications_playId_fkey" FOREIGN KEY ("playId") REFERENCES "plays"("id") ON DELETE CASCADE ON UPDATE CASCADE;
