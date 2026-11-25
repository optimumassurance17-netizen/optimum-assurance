-- Les prélèvements déjà ouverts restent trimestriels.
-- Les nouveaux mandats décennale enregistrent "mensuel".
ALTER TABLE "SepaSubscription" ADD COLUMN IF NOT EXISTS "periodicite" TEXT NOT NULL DEFAULT 'trimestriel';
