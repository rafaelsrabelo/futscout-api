-- CreateIndex
CREATE INDEX IF NOT EXISTS "plays_athleteId_videoUrl_idx" ON "plays"("athleteId", "videoUrl");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "plays_matchId_idx" ON "plays"("matchId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "plays_videoUrl_idx" ON "plays"("videoUrl");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "plays_createdAt_idx" ON "plays"("createdAt");

