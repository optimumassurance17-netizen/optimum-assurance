CREATE TABLE IF NOT EXISTS "AdsConnection" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "accountEmail" TEXT,
  "customerId" TEXT,
  "refreshTokenEncrypted" TEXT NOT NULL,
  "connectedByEmail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdsConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdsConnection_provider_key" ON "AdsConnection"("provider");
