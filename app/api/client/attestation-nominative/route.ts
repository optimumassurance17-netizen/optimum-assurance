import { randomBytes } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getNextNumero } from "@/lib/documents"
import { parseActivitiesJson } from "@/lib/insurance-contract-activities"
import { prisma } from "@/lib/prisma"

type CreateNominativeBody = {
  beneficiaireNom?: string
  chantierAdresse?: string
  objetMission?: string
}

function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return ""
  return value.replace(/\s+/g, " ").trim().slice(0, max)
}

function parseFlexibleDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null
  const raw = value.trim()
  const parts = raw.split("/")
  if (parts.length === 3) {
    const day = Number(parts[0])
    const month = Number(parts[1]) - 1
    const year = Number(parts[2])
    const fromFr = new Date(year, month, day)
    return Number.isNaN(fromFr.getTime()) ? null : fromFr
  }
  const fallback = new Date(raw)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

function toFrDate(date: Date | null): string {
  if (!date) return new Date().toLocaleDateString("fr-FR")
  return date.toLocaleDateString("fr-FR")
}

function verificationToken(): string {
  return randomBytes(16).toString("hex")
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const rawBody = (await request.json().catch(() => ({}))) as CreateNominativeBody
    const beneficiaireNom = cleanText(rawBody.beneficiaireNom, 140)
    const chantierAdresse = cleanText(rawBody.chantierAdresse, 220)
    const objetMission = cleanText(rawBody.objetMission, 220)

    if (beneficiaireNom.length < 2) {
      return NextResponse.json(
        { error: "Le nom du bénéficiaire est requis (minimum 2 caractères)." },
        { status: 400 }
      )
    }

    const latestAttestation = await prisma.document.findFirst({
      where: {
        userId: session.user.id,
        type: "attestation",
        status: "valide",
      },
      orderBy: { createdAt: "desc" },
      select: { numero: true, data: true, status: true },
    })

    const sourceAttestationData = latestAttestation
      ? (JSON.parse(latestAttestation.data) as Record<string, unknown>)
      : null

    const fallbackContract = await prisma.insuranceContract.findFirst({
      where: {
        userId: session.user.id,
        productType: "decennale",
        status: { in: ["active", "approved"] },
      },
      orderBy: [{ validUntil: "desc" }, { createdAt: "desc" }],
      select: {
        contractNumber: true,
        clientName: true,
        siret: true,
        address: true,
        premium: true,
        activitiesJson: true,
        validFrom: true,
        validUntil: true,
      },
    })

    const activitesFromAttestation = Array.isArray(sourceAttestationData?.activites)
      ? sourceAttestationData?.activites.filter(
          (item): item is string => typeof item === "string" && item.trim().length > 0
        )
      : []
    const activites = activitesFromAttestation.length
      ? activitesFromAttestation
      : parseActivitiesJson(fallbackContract?.activitiesJson)

    const numero = await getNextNumero("attestation_nominative")
    const dateEffet = toFrDate(
      parseFlexibleDate(sourceAttestationData?.dateEffet) ?? fallbackContract?.validFrom ?? null
    )
    const dateEcheance = toFrDate(
      parseFlexibleDate(sourceAttestationData?.dateEcheance) ?? fallbackContract?.validUntil ?? null
    )

    const payload = {
      raisonSociale:
        cleanText(sourceAttestationData?.raisonSociale, 180) ||
        cleanText(fallbackContract?.clientName, 180) ||
        cleanText(session.user.name, 180) ||
        cleanText(session.user.email, 180) ||
        "Assuré",
      siret:
        cleanText(sourceAttestationData?.siret, 32) ||
        cleanText(fallbackContract?.siret, 32) ||
        "Non renseigné",
      adresse:
        cleanText(sourceAttestationData?.adresse, 220) ||
        cleanText(fallbackContract?.address, 220),
      codePostal: cleanText(sourceAttestationData?.codePostal, 10),
      ville: cleanText(sourceAttestationData?.ville, 120),
      activites: activites.length ? activites : ["Activité déclarée au contrat"],
      primeAnnuelle:
        typeof sourceAttestationData?.primeAnnuelle === "number"
          ? sourceAttestationData.primeAnnuelle
          : Number(fallbackContract?.premium || 0),
      dateEffet,
      dateEcheance,
      attestationNominative: true,
      beneficiaireNom,
      chantierAdresse,
      objetMission,
      sourceAttestationNumero: latestAttestation?.numero || null,
      sourceContractNumber: fallbackContract?.contractNumber || null,
      createdAt: new Date().toISOString(),
    }

    const document = await prisma.document.create({
      data: {
        userId: session.user.id,
        type: "attestation_nominative",
        numero,
        status: latestAttestation?.status || "valide",
        verificationToken: verificationToken(),
        data: JSON.stringify(payload),
      },
      select: { id: true, numero: true, verificationToken: true },
    })

    return NextResponse.json(document)
  } catch (error) {
    console.error("Erreur création attestation nominative:", error)
    return NextResponse.json(
      { error: "Impossible de créer l'attestation nominative pour le moment." },
      { status: 500 }
    )
  }
}
