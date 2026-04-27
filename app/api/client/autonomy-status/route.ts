import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isDecennaleAttestationType } from "@/lib/decennale-impaye"
import { prisma } from "@/lib/prisma"

type PendingContractData = {
  customUploadedDevisFlow?: unknown
  afterSignNextPath?: unknown
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeInternalPath(path: string | null | undefined, fallback: string): string {
  const normalized = path?.trim() || ""
  if (!normalized.startsWith("/") || normalized.startsWith("//")) return fallback
  return normalized.slice(0, 512)
}

function parseJsonObject(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    return {}
  } catch {
    return {}
  }
}

type AutonomyAction = {
  id: string
  title: string
  description: string
  href: string
  priority: "high" | "medium" | "low"
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const userId = session.user.id
    const [pendingRows, latestDecennaleContract, paidPayments, sepa, approvedUnpaidContracts, docs] =
      await Promise.all([
        prisma.pendingSignature.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            signatureRequestId: true,
            contractData: true,
          },
        }),
        prisma.document.findFirst({
          where: { userId, type: "contrat" },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        }),
        prisma.payment.findMany({
          where: { userId, status: "paid" },
          select: { metadata: true },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        prisma.sepaSubscription.findUnique({
          where: { userId },
          select: {
            status: true,
            nextSepaDue: true,
            trimestresSepaPayes: true,
            lastError: true,
          },
        }),
        prisma.insuranceContract.count({
          where: { userId, status: "approved", paidAt: null },
        }),
        prisma.document.findMany({
          where: { userId },
          select: { type: true, status: true },
          take: 500,
          orderBy: { createdAt: "desc" },
        }),
      ])

    const pendingDecennale = pendingRows
      .map((row) => {
        const parsed = parseJsonObject(row.contractData) as PendingContractData
        const customUploadedDevisFlow = parsed.customUploadedDevisFlow === true
        if (customUploadedDevisFlow) return null
        const nextPath = normalizeInternalPath(asTrimmedString(parsed.afterSignNextPath), "/mandat-sepa")
        return {
          signatureRequestId: row.signatureRequestId,
          signatureLink: `/sign/${row.signatureRequestId}?next=${encodeURIComponent(nextPath)}`,
        }
      })
      .filter((row): row is { signatureRequestId: string; signatureLink: string } => Boolean(row))

    const decennaleFirstPaymentDone = paidPayments.some((payment) => {
      const m = parseJsonObject(payment.metadata)
      return (
        m.premierPaiementCarte === true ||
        m.premierPaiementCarte === "true" ||
        m.type === "decennale_premier_trimestre"
      )
    })

    const suspendedDecennaleAttestationsCount = docs.filter(
      (doc) => isDecennaleAttestationType(doc.type) && doc.status === "suspendu"
    ).length

    const hasDecennaleContract = Boolean(latestDecennaleContract)
    const actions: AutonomyAction[] = []
    const advisories: string[] = []

    if (pendingDecennale.length > 0) {
      actions.push({
        id: "resume-signature-decennale",
        title: "Finaliser votre signature électronique",
        description:
          "Votre devis/contrat décennale attend votre signature. Cette étape débloque le mandat SEPA puis le paiement.",
        href: pendingDecennale[0].signatureLink,
        priority: "high",
      })
    }

    if (hasDecennaleContract && !decennaleFirstPaymentDone && pendingDecennale.length === 0) {
      actions.push({
        id: "continue-sepa-and-payment",
        title: "Continuer le parcours mandat SEPA + paiement",
        description:
          "Votre contrat est signé. Renseignez votre mandat SEPA puis lancez le premier paiement pour activer le dossier.",
        href: "/mandat-sepa",
        priority: "high",
      })
    }

    if (suspendedDecennaleAttestationsCount > 0) {
      actions.push({
        id: "regularize-suspended-attestation",
        title: "Régulariser vos attestations suspendues",
        description:
          "Des attestations décennale sont suspendues pour impayé. Vous pouvez les régulariser immédiatement en ligne.",
        href: "/espace-client/regularisation",
        priority: "high",
      })
    }

    if (approvedUnpaidContracts > 0) {
      actions.push({
        id: "pay-approved-contracts",
        title: "Payer vos contrats plateforme approuvés",
        description:
          "Un ou plusieurs contrats sont approuvés mais encore impayés. Utilisez les boutons de paiement dans la section contrats.",
        href: "#contrats-plateforme",
        priority: "medium",
      })
    }

    if (decennaleFirstPaymentDone && (!sepa || sepa.status === "pending_mandate" || sepa.status === "failed")) {
      advisories.push(
        "Votre premier paiement est enregistré. L’activation SEPA est en cours ; en cas de blocage persistant, un suivi dédié peut être déclenché côté gestion."
      )
    }

    if (actions.length === 0) {
      actions.push({
        id: "autonomy-ok",
        title: "Aucune action urgente",
        description:
          "Votre dossier est à jour. Vous pouvez télécharger vos documents, gérer votre profil et lancer de nouveaux devis en autonomie.",
        href: "/espace-client",
        priority: "low",
      })
    }

    return NextResponse.json({
      pendingSignaturesTotal: pendingRows.length,
      pendingSignaturesDecennale: pendingDecennale.length,
      hasDecennaleContract,
      firstDecennalePaymentDone: decennaleFirstPaymentDone,
      approvedUnpaidContractsCount: approvedUnpaidContracts,
      suspendedAttestationsCount: suspendedDecennaleAttestationsCount,
      sepaSubscription: sepa
        ? {
            status: sepa.status,
            nextSepaDue: sepa.nextSepaDue?.toISOString() ?? null,
            trimestresSepaPayes: sepa.trimestresSepaPayes,
            lastError: sepa.lastError ?? null,
          }
        : null,
      advisories,
      actions,
    })
  } catch (error) {
    console.error("Erreur autonomy-status client:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération du statut d'autonomie" }, { status: 500 })
  }
}
