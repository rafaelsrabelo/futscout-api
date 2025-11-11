-- CreateTable
CREATE TABLE "observer_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currentClub" TEXT,
    "phone" TEXT NOT NULL,
    "profilePhoto" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "observer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "observer_profiles_userId_key" ON "observer_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "observer_profiles_cpf_key" ON "observer_profiles"("cpf");

-- AddForeignKey
ALTER TABLE "observer_profiles" ADD CONSTRAINT "observer_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
