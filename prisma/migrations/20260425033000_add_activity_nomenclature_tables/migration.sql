-- Nomenclature activités BTP (France Assureurs 2019) + backlog activités manquantes

CREATE TABLE "Activity" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "definition" TEXT NOT NULL,
  "includedWorks" TEXT NOT NULL,
  "excludedWorks" TEXT NOT NULL,
  "relatedActivities" TEXT NOT NULL,
  "isAccessoryAllowed" BOOLEAN NOT NULL DEFAULT false,
  "version" TEXT NOT NULL DEFAULT 'france-assureurs-2019',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Activity_code_key" ON "Activity"("code");

CREATE TABLE "MissingActivity" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "userInput" TEXT NOT NULL,
  "suggestedMatch" TEXT,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validated" BOOLEAN NOT NULL DEFAULT false,
  "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MissingActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MissingActivity_userInput_idx" ON "MissingActivity"("userInput");
CREATE INDEX "MissingActivity_validated_date_idx" ON "MissingActivity"("validated", "date");
CREATE INDEX "MissingActivity_suggestedMatch_idx" ON "MissingActivity"("suggestedMatch");

ALTER TABLE "MissingActivity"
ADD CONSTRAINT "MissingActivity_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
