-- Hiérarchie activités BTP (France Assureurs 2019)
-- Groupes -> Activités -> Sous-activités + table de suivi des activités manquantes

CREATE TABLE "ActivityGroup" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "definition" TEXT,
  "version" TEXT NOT NULL DEFAULT 'france-assureurs-2019',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ActivityGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ActivityGroup_code_key" ON "ActivityGroup"("code");

CREATE TABLE "Activity" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "groupCode" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "definition" TEXT NOT NULL,
  "includedWorks" TEXT,
  "excludedWorks" TEXT,
  "relatedActivities" TEXT,
  "isAccessoryAllowed" BOOLEAN NOT NULL DEFAULT false,
  "version" TEXT NOT NULL DEFAULT 'france-assureurs-2019',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Activity_code_key" ON "Activity"("code");
CREATE INDEX "Activity_groupId_idx" ON "Activity"("groupId");
CREATE INDEX "Activity_groupCode_idx" ON "Activity"("groupCode");

CREATE TABLE "SubActivity" (
  "id" TEXT NOT NULL,
  "activityId" TEXT NOT NULL,
  "groupCode" TEXT NOT NULL,
  "activityCode" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "includedWorks" TEXT,
  "excludedWorks" TEXT,
  "relatedActivities" TEXT,
  "version" TEXT NOT NULL DEFAULT 'france-assureurs-2019',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubActivity_code_key" ON "SubActivity"("code");
CREATE INDEX "SubActivity_activityId_idx" ON "SubActivity"("activityId");
CREATE INDEX "SubActivity_groupCode_idx" ON "SubActivity"("groupCode");
CREATE INDEX "SubActivity_activityCode_idx" ON "SubActivity"("activityCode");

CREATE TABLE "MissingSubActivity" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "userInput" TEXT NOT NULL,
  "suggestedGroupCode" TEXT,
  "suggestedGroupName" TEXT,
  "suggestedActivityCode" TEXT,
  "suggestedActivityName" TEXT,
  "suggestedSubActivityCode" TEXT,
  "suggestedSubActivityName" TEXT,
  "confidence" DOUBLE PRECISION,
  "validated" BOOLEAN NOT NULL DEFAULT false,
  "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MissingSubActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MissingSubActivity_userInput_idx" ON "MissingSubActivity"("userInput");
CREATE UNIQUE INDEX "missing_sub_activity_user_input_unique" ON "MissingSubActivity"("userId", "userInput");

ALTER TABLE "Activity"
ADD CONSTRAINT "Activity_groupId_fkey"
FOREIGN KEY ("groupId") REFERENCES "ActivityGroup"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubActivity"
ADD CONSTRAINT "SubActivity_activityId_fkey"
FOREIGN KEY ("activityId") REFERENCES "Activity"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MissingSubActivity"
ADD CONSTRAINT "MissingSubActivity_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
