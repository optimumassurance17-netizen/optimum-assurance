-- CreateTable
CREATE TABLE "DevisRcFabriquantLead" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevisRcFabriquantLead_pkey" PRIMARY KEY ("id")
);
