-- Idempotent : la migration 20260531190500 échoue si les colonnes existent déjà,
-- et ne s'applique pas tant que l'historique Prisma de production est incomplet.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "titleInitialQuestionnaireJson" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "titleEtudeQuestionnaireJson" TEXT;
