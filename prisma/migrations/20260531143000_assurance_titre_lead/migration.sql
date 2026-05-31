-- CreateTable
CREATE TABLE "DevisAssuranceTitreLead" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'a_traiter',
    "notesInternes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevisAssuranceTitreLead_pkey" PRIMARY KEY ("id")
);
