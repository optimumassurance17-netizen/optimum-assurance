import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculerTarif } from "@/lib/tarification"
import { asJsonObject } from "@/lib/json-object"

type Baseline = {
  sourceDocumentId: string
  sourceType: string
  sourceNumero: string
  sourceCreatedAt: string
  chiffreAffairesPrevu: number
  primeAnnuelleActuelle: number
  activites: string[]
  sinistres: number
  jamaisAssure: boolean
  resilieNonPaiement: boolean
  reprisePasse: boolean
}

function toPositiveNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

function parseBaselineFromDocument(doc: {
  id: string
  type: string
  numero: string
  data: string
  createdAt: Date
}): Baseline | null {
  let parsed: Record<string, unknown>
  try {
    parsed = asJsonObject(JSON.parse(doc.data || "{}"))
  } catch {
    return null
  }

  const produit = typeof parsed.produit === "string" ? parsed.produit.trim().toLowerCase() : ""
  if (produit === "dommage_ouvrage") return null

  const activitesRaw = Array.isArray(parsed.activites) ? parsed.activites : []
  const activites = activitesRaw
    .map((a) => (typeof a === "string" ? a.trim() : ""))
    .filter((a) => a.length > 0)
  if (activites.length === 0) return null

  const chiffreAffairesPrevu = toPositiveNumber(parsed.chiffreAffaires)
  const primeAnnuelleActuelle = toPositiveNumber(parsed.primeAnnuelle)
  if (!chiffreAffairesPrevu || !primeAnnuelleActuelle) return null

  const sinistresRaw =
    typeof parsed.sinistres === "number" ? parsed.sinistres : Number(parsed.sinistres ?? 0)
  const sinistres = Number.isFinite(sinistresRaw) && sinistresRaw > 0 ? Math.floor(sinistresRaw) : 0

  return {
    sourceDocumentId: doc.id,
    sourceType: doc.type,
    sourceNumero: doc.numero,
    sourceCreatedAt: doc.createdAt.toISOString(),
    chiffreAffairesPrevu,
    primeAnnuelleActuelle,
    activites,
    sinistres,
    jamaisAssure: parsed.jamaisAssure === true,
    resilieNonPaiement: parsed.resilieNonPaiement === true,
    reprisePasse: parsed.reprisePasse === true,
  }
}

async function getUserBaseline(userId: string): Promise<Baseline | null> {
  const docs = await prisma.document.findMany({
    where: {
      userId,
      type: { in: ["contrat", "devis", "attestation"] },
    },
    select: {
      id: true,
      type: true,
      numero: true,
      data: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  })

  for (const doc of docs) {
    const baseline = parseBaselineFromDocument(doc)
    if (baseline) return baseline
  }
  return null
}

function parseLastDeclaration(detailsRaw: string | null): {
  declaredCa: number
  regularisationAmount: number
  applyRegularisation: boolean
  newPrimeAnnuelle: number
} | null {
  if (!detailsRaw) return null
  try {
    const details = asJsonObject(JSON.parse(detailsRaw))
    const declaredCa = Number(details.declaredCa)
    const regularisationAmount = Number(details.regularisationAmount)
    const newPrimeAnnuelle = Number(details.newPrimeAnnuelle)
    if (
      !Number.isFinite(declaredCa) ||
      !Number.isFinite(regularisationAmount) ||
      !Number.isFinite(newPrimeAnnuelle)
    ) {
      return null
    }
    return {
      declaredCa,
      regularisationAmount,
      applyRegularisation: details.applyRegularisation === true,
      newPrimeAnnuelle,
    }
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const baseline = await getUserBaseline(session.user.id)
    if (!baseline) {
      return NextResponse.json({
        available: false,
        message:
          "Aucune base de calcul décennale exploitable trouvée (CA prévu + prime annuelle + activités).",
      })
    }

    const lastLog = await prisma.adminActivityLog.findFirst({
      where: {
        action: "client_ca_declaration_regularisation_calc",
        targetType: "user",
        targetId: session.user.id,
      },
      select: { createdAt: true, details: true },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      available: true,
      baseline,
      lastDeclaration: lastLog
        ? {
            createdAt: lastLog.createdAt.toISOString(),
            ...parseLastDeclaration(lastLog.details),
          }
        : null,
    })
  } catch (error) {
    console.error("[client/ca-regularisation][GET]", error)
    return NextResponse.json({ error: "Erreur lors du chargement" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = asJsonObject<{ chiffreAffairesReel?: unknown }>(await request.json())
    const declaredCa = toPositiveNumber(body.chiffreAffairesReel)
    if (!declaredCa) {
      return NextResponse.json({ error: "Chiffre d'affaires annuel invalide" }, { status: 400 })
    }

    const baseline = await getUserBaseline(session.user.id)
    if (!baseline) {
      return NextResponse.json(
        { error: "Aucune base de calcul décennale disponible pour la régularisation." },
        { status: 404 }
      )
    }

    let newPrimeAnnuelle = baseline.primeAnnuelleActuelle
    let applyRegularisation = false

    if (declaredCa > baseline.chiffreAffairesPrevu) {
      const recalculated = calculerTarif({
        chiffreAffaires: declaredCa,
        sinistres: baseline.sinistres,
        jamaisAssure: baseline.jamaisAssure,
        resilieNonPaiement: baseline.resilieNonPaiement,
        activites: baseline.activites,
        reprisePasse: baseline.reprisePasse,
      })
      // Règle métier : on ne régularise qu'en hausse, jamais en baisse.
      newPrimeAnnuelle = Math.max(baseline.primeAnnuelleActuelle, recalculated.primeAnnuelle)
      applyRegularisation = newPrimeAnnuelle > baseline.primeAnnuelleActuelle
    }

    const regularisationAmount = applyRegularisation
      ? Math.round((newPrimeAnnuelle - baseline.primeAnnuelleActuelle) * 100) / 100
      : 0

    await prisma.adminActivityLog.create({
      data: {
        adminEmail: session.user.email || "client",
        action: "client_ca_declaration_regularisation_calc",
        targetType: "user",
        targetId: session.user.id,
        details: JSON.stringify({
          baselineCa: baseline.chiffreAffairesPrevu,
          declaredCa,
          baselinePrimeAnnuelle: baseline.primeAnnuelleActuelle,
          newPrimeAnnuelle,
          regularisationAmount,
          applyRegularisation,
          sourceDocumentId: baseline.sourceDocumentId,
          sourceNumero: baseline.sourceNumero,
        }),
      },
    })

    return NextResponse.json({
      baseline,
      declaredCa,
      applyRegularisation,
      regularisationAmount,
      newPrimeAnnuelle,
      cotisationInchangee: !applyRegularisation,
      reason:
        declaredCa <= baseline.chiffreAffairesPrevu
          ? "CA réel inférieur ou égal au CA prévu : cotisation inchangée."
          : applyRegularisation
            ? "CA réel supérieur au prévu : régularisation appliquée."
            : "CA réel supérieur au prévu mais recalcul sans hausse : cotisation inchangée.",
    })
  } catch (error) {
    console.error("[client/ca-regularisation][POST]", error)
    return NextResponse.json({ error: "Erreur lors du calcul de régularisation" }, { status: 500 })
  }
}
