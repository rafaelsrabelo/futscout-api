-- Caixa de entrada do usuário. Diferente de notification_logs, que registra
-- campanhas do admin, aqui é o que cada usuário recebeu.

CREATE TYPE "UserNotificationType" AS ENUM ('FAVORITE_MATCH', 'FAVORITE_PLAY');

CREATE TABLE "user_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "UserNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "actorAthleteId" TEXT,
    "groupKey" TEXT NOT NULL,
    "eventCount" INTEGER NOT NULL DEFAULT 1,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);

-- Listagem paginada do usuário e contagem de não lidas.
CREATE INDEX "user_notifications_userId_readAt_createdAt_idx"
    ON "user_notifications"("userId", "readAt", "createdAt");
-- Busca da notificação aberta para agregar em vez de criar outra.
CREATE INDEX "user_notifications_groupKey_readAt_idx"
    ON "user_notifications"("groupKey", "readAt");

ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_actorAthleteId_fkey"
    FOREIGN KEY ("actorAthleteId") REFERENCES "athlete_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Interruptor por observador. Default true: quem já favoritou alguém quis
-- acompanhar aquele atleta.
ALTER TABLE "observer_profiles"
    ADD COLUMN "notifyOnFavoriteActivity" BOOLEAN NOT NULL DEFAULT true;
