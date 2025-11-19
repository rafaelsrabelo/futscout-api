-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('CREDENTIALS', 'GOOGLE', 'APPLE');

-- AlterTable
ALTER TABLE "users"
ADD COLUMN     "provider" "AuthProvider" NOT NULL DEFAULT 'CREDENTIALS',
ADD COLUMN     "providerId" TEXT,
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "users_provider_providerId_key" ON "users"("provider", "providerId");

