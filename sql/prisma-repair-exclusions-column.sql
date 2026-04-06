-- Réparation manuelle si la migration 20260406000000 est en « failed » :
-- exécuter dans Neon / SQL Editor sur la MÊME base que DATABASE_URL, puis :
--   npx prisma migrate resolve --applied "20260406000000_add_insurance_exclusions_json"
--   npx prisma migrate deploy
--
-- Échoue si la table "InsuranceContract" n’existe pas → aligner le schéma (prisma db push) avant.

ALTER TABLE "InsuranceContract" ADD COLUMN IF NOT EXISTS "exclusionsJson" TEXT;
