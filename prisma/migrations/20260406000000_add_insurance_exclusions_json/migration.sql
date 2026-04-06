-- AlterTable (idempotent : évite l’échec si la colonne existe déjà ou reprise après erreur)
ALTER TABLE "InsuranceContract" ADD COLUMN IF NOT EXISTS "exclusionsJson" TEXT;
