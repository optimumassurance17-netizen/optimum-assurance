-- Traçabilité WhatsApp sur les leads RC Fabriquant
ALTER TABLE "DevisRcFabriquantLead"
ADD COLUMN "lastWhatsappClickAt" TIMESTAMP(3),
ADD COLUMN "lastWhatsappSource" TEXT,
ADD COLUMN "lastWhatsappRef" TEXT;
