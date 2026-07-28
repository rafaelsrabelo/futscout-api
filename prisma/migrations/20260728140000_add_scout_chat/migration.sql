-- Chat de busca de atletas (IAFutscore): substitui o formulário de filtros do
-- observador por uma conversa que a IA traduz em AthleteFilters.

CREATE TYPE "ScoutThreadStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "ScoutMessageRole" AS ENUM ('USER', 'ASSISTANT', 'TOOL');

CREATE TABLE "scout_threads" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "status" "ScoutThreadStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scout_threads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "scout_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "role" "ScoutMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "toolCall" JSONB,
    "cards" JSONB,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scout_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "scout_threads_userId_createdAt_idx" ON "scout_threads"("userId", "createdAt");
CREATE INDEX "scout_messages_threadId_createdAt_idx" ON "scout_messages"("threadId", "createdAt");

ALTER TABLE "scout_threads" ADD CONSTRAINT "scout_threads_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scout_messages" ADD CONSTRAINT "scout_messages_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "scout_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Contadores de uso do chat, no mesmo modelo dos limites de partidas/vídeos.
ALTER TABLE "plans" ADD COLUMN "monthlyLimitAiMessages" INTEGER;
ALTER TABLE "usages" ADD COLUMN "aiMessagesUsed" INTEGER NOT NULL DEFAULT 0;
