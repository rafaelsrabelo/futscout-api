-- CreateTable
CREATE TABLE "scouts" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "totalPlays" INTEGER NOT NULL DEFAULT 0,
    "positiveActions" INTEGER NOT NULL DEFAULT 0,
    "negativeActions" INTEGER NOT NULL DEFAULT 0,
    "neutralActions" INTEGER NOT NULL DEFAULT 0,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "defensiveActions" INTEGER NOT NULL DEFAULT 0,
    "tackles" INTEGER NOT NULL DEFAULT 0,
    "interceptions" INTEGER NOT NULL DEFAULT 0,
    "crosses" INTEGER NOT NULL DEFAULT 0,
    "dribbles" INTEGER NOT NULL DEFAULT 0,
    "fouls" INTEGER NOT NULL DEFAULT 0,
    "yellowCards" INTEGER NOT NULL DEFAULT 0,
    "redCards" INTEGER NOT NULL DEFAULT 0,
    "overallRating" DOUBLE PRECISION,
    "performanceNote" TEXT,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scouts_matchId_key" ON "scouts"("matchId");

-- AddForeignKey
ALTER TABLE "scouts" ADD CONSTRAINT "scouts_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
