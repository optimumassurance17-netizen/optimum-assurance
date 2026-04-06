-- Suivi décision humaine (statut + notes) pour les leads RC Fabriquant
ALTER TABLE "DevisRcFabriquantLead" ADD COLUMN "statut" TEXT NOT NULL DEFAULT 'a_traiter';
ALTER TABLE "DevisRcFabriquantLead" ADD COLUMN "notesInternes" TEXT;
ALTER TABLE "DevisRcFabriquantLead" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
