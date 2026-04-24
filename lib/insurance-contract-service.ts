import type { InsuranceContract } from "@/lib/prisma-client"
import { prisma } from "@/lib/prisma"
import { allocateNextContractNumber } from "@/lib/pdf/shared/contractNumber"
import { CONTRACT_STATUS } from "@/lib/insurance-contract-status"
import { calculateRiskScore, requiresManualReview } from "@/lib/risk-scoring"
import { renderContractPdf } from "@/lib/insurance-contract-pdf"
import { SITE_URL } from "@/lib/site-url"
import { primeTrimestrielle } from "@/lib/premium"

export type CreateContractInput = {
  productType: "decennale" | "do"
  clientName: string
  siret?: string
  address: string
  activities?: string[]
  /** Activités / travaux explicitement exclus du contrat (décennale surtout) */
  exclusions?: string[]
  projectName?: string
  projectAddress?: string
  constructionNature?: string
  premium: number
  userId?: string
  missingDocuments?: boolean
  companyAgeMonths?: number | null
}

export async function logContractAction(
  contractId: string,
  action: string,
  details?: Record<string, unknown>,
  actorEmail?: string
) {
  await prisma.contractActionLog.create({
    data: {
      contractId,
      action,
      details: details ? JSON.stringify(details) : undefined,
      actorEmail,
    },
  })
}

export async function createInsuranceContract(input: CreateContractInput) {
  const risk = calculateRiskScore({
    siret: input.siret,
    activities: input.activities,
    missingDocuments: input.missingDocuments,
    companyAgeMonths: input.companyAgeMonths,
  })

  const contractNumber = await allocateNextContractNumber(input.productType)
  // Politique produit: aucun refus automatique, validation humaine prioritaire si risque élevé.
  const status = (risk.reject || requiresManualReview(risk.score))
    ? CONTRACT_STATUS.pending_validation
    : CONTRACT_STATUS.approved

  const c = await prisma.insuranceContract.create({
    data: {
      contractNumber,
      userId: input.userId,
      productType: input.productType,
      clientName: input.clientName,
      siret: input.siret ?? undefined,
      address: input.address,
      activitiesJson: input.activities?.length ? JSON.stringify(input.activities) : undefined,
      exclusionsJson: input.exclusions?.length ? JSON.stringify(input.exclusions) : undefined,
      projectName: input.projectName,
      projectAddress: input.projectAddress,
      constructionNature: input.constructionNature,
      premium: input.premium,
      status,
      riskScore: risk.score,
      insurerValidatedAt: status === CONTRACT_STATUS.approved ? new Date() : null,
    },
  })

  await logContractAction(c.id, "created", {
    status,
    riskScore: risk.score,
    manualValidationRequired: risk.reject || requiresManualReview(risk.score),
    riskReasons: risk.reasons,
  })

  const baseUrl = `${SITE_URL}/api/contracts/${c.id}/pdf`
  for (const type of ["quote", "policy"] as const) {
    await prisma.contractStoredDocument.upsert({
      where: {
        contractId_type: { contractId: c.id, type },
      },
      create: { contractId: c.id, type, url: `${baseUrl}/${type}` },
      update: { url: `${baseUrl}/${type}` },
    })
  }

  return { contract: c, risk }
}

export async function approveInsuranceContract(contractId: string, actorEmail: string) {
  const c = await prisma.insuranceContract.findUnique({ where: { id: contractId } })
  if (!c) throw new Error("NOT_FOUND")
  if (c.status !== CONTRACT_STATUS.pending_validation) {
    throw new Error("INVALID_STATE")
  }
  const updated = await prisma.insuranceContract.update({
    where: { id: contractId },
    data: {
      status: CONTRACT_STATUS.approved,
      insurerValidatedAt: new Date(),
    },
  })
  await logContractAction(contractId, "approved", {}, actorEmail)
  return updated
}

export async function rejectInsuranceContract(contractId: string, reason: string, actorEmail: string) {
  const c = await prisma.insuranceContract.findUnique({ where: { id: contractId } })
  if (!c) throw new Error("NOT_FOUND")
  if (c.status === CONTRACT_STATUS.active) {
    throw new Error("INVALID_STATE")
  }
  const updated = await prisma.insuranceContract.update({
    where: { id: contractId },
    data: {
      status: CONTRACT_STATUS.rejected,
      rejectedReason: reason,
    },
  })
  await logContractAction(contractId, "rejected", { reason }, actorEmail)
  return updated
}

function addYears(d: Date, years: number): Date {
  const x = new Date(d)
  x.setFullYear(x.getFullYear() + years)
  return x
}

/** Tolérance ~1 centime pour arrondis Mollie / float. */
const PREMIUM_PAYMENT_EPS = 0.02

export function premiumMatchesMollieAmount(contractPremium: number, paidAmount: number): boolean {
  const exp = Math.round(contractPremium * 100) / 100
  const got = Math.round(paidAmount * 100) / 100
  return Math.abs(exp - got) <= PREMIUM_PAYMENT_EPS
}

/**
 * Montant attendu pour un paiement Mollie `insurance_contract` (virement).
 * - **Décennale** : `premium` en base = prime **annuelle** TTC → chaque virement = 1 trimestre (hors parcours 1er trimestre CB + SEPA).
 * - **DO** : `premium` = montant unique du contrat.
 * - **RC Fabriquant** : `premium` = montant de l’échéance courante (saisi en gestion).
 */
export function mollieExpectedAmountForInsuranceContract(productType: string, premiumAnnualOrInstallment: number): number {
  const p = Math.round(premiumAnnualOrInstallment * 100) / 100
  if (productType === "decennale") {
    return primeTrimestrielle(premiumAnnualOrInstallment)
  }
  return p
}

/** Comparaison paiement ↔ contrat (prend en compte la décennale = trimestre). */
export function insuranceContractPaymentAmountMatches(
  productType: string,
  contractPremium: number,
  paidAmount: number
): boolean {
  const expected = mollieExpectedAmountForInsuranceContract(productType, contractPremium)
  return premiumMatchesMollieAmount(expected, paidAmount)
}

async function generatePostPaymentPdfs(contractId: string, fresh: InsuranceContract): Promise<void> {
  const certBytes = await renderContractPdf(fresh, "certificate")
  const invBytes = await renderContractPdf(fresh, "invoice")
  let scheduleBytes: Uint8Array | null = null
  if (fresh.productType === "decennale" || fresh.productType === "rc_fabriquant") {
    try {
      scheduleBytes = await renderContractPdf(fresh, "schedule")
    } catch (e) {
      console.error("[generatePostPaymentPdfs] schedule:", e)
    }
  }
  const baseUrl = `${SITE_URL}/api/contracts/${contractId}/pdf`
  const deleteTypes =
    fresh.productType === "decennale" || fresh.productType === "rc_fabriquant"
      ? (["certificate", "invoice", "schedule"] as const)
      : (["certificate", "invoice"] as const)
  await prisma.contractStoredDocument.deleteMany({
    where: { contractId, type: { in: [...deleteTypes] } },
  })
  const rows: { contractId: string; type: string; url: string }[] = [
    { contractId, type: "certificate", url: `${baseUrl}/certificate` },
    { contractId, type: "invoice", url: `${baseUrl}/invoice` },
  ]
  if (scheduleBytes) {
    rows.push({ contractId, type: "schedule", url: `${baseUrl}/schedule` })
  }
  await prisma.contractStoredDocument.createMany({ data: rows })
  await logContractAction(contractId, "pdfs_generated", {
    certificateBytes: certBytes.byteLength,
    invoiceBytes: invBytes.byteLength,
    ...(scheduleBytes ? { scheduleBytes: scheduleBytes.byteLength } : {}),
  })
}

/** Si paiement enregistré mais PDF attestation/facture absents (retry webhook ou panne). */
export async function ensurePostPaymentPdfsIfMissing(contractId: string): Promise<void> {
  const c = await prisma.insuranceContract.findUnique({ where: { id: contractId } })
  if (!c || c.status !== CONTRACT_STATUS.active || !c.paidAt) return
  const hasCert = await prisma.contractStoredDocument.findFirst({
    where: { contractId, type: "certificate" },
  })
  if (hasCert) return
  const fresh = await prisma.insuranceContract.findUniqueOrThrow({ where: { id: contractId } })
  try {
    await generatePostPaymentPdfs(contractId, fresh)
  } catch (e) {
    console.error("[ensurePostPaymentPdfsIfMissing]", e)
    await logContractAction(contractId, "pdf_generation_failed", {
      message: e instanceof Error ? e.message : String(e),
    })
  }
}

export type ProcessInsurancePaymentResult =
  | { ok: true; contract: InsuranceContract; idempotent: boolean }
  | {
      ok: false
      error:
        | "NOT_FOUND"
        | "INVALID_STATE_FOR_PAYMENT"
        | "AMOUNT_MISMATCH"
        | "PDF_GENERATION_FAILED"
    }

export async function processInsuranceContractPaymentSuccess(
  contractId: string,
  molliePaymentId: string,
  amount: number
): Promise<ProcessInsurancePaymentResult> {
  const existing = await prisma.contractLifecyclePayment.findUnique({
    where: { molliePaymentId },
  })
  if (existing?.status === "paid") {
    const c = await prisma.insuranceContract.findUnique({ where: { id: existing.contractId } })
    if (c) {
      await ensurePostPaymentPdfsIfMissing(c.id)
      return { ok: true, contract: c, idempotent: true }
    }
  }

  const c = await prisma.insuranceContract.findUnique({ where: { id: contractId } })
  if (!c) return { ok: false, error: "NOT_FOUND" }

  /**
   * RC Fabriquant : cotisation par échéances (virement Mollie). Une fois le contrat actif, les paiements suivants
   * avec un **nouvel** id Mollie doivent être enregistrés (trimestre suivant), pas ignorés comme doublon.
   */
  if (c.status === CONTRACT_STATUS.active && c.paidAt && c.productType === "rc_fabriquant") {
    if (!premiumMatchesMollieAmount(c.premium, amount)) {
      await logContractAction(contractId, "payment_amount_mismatch", {
        molliePaymentId,
        expectedPremium: c.premium,
        paidAmount: amount,
        context: "rc_fabriquant_installment",
      })
      return { ok: false, error: "AMOUNT_MISMATCH" }
    }
    const paidAt = new Date()
    await prisma.$transaction(async (tx) => {
      await tx.contractLifecyclePayment.upsert({
        where: { molliePaymentId },
        create: {
          contractId,
          molliePaymentId,
          amount,
          status: "paid",
          paidAt,
        },
        update: { status: "paid", paidAt },
      })
      await tx.insuranceContract.update({
        where: { id: contractId },
        data: { paidAt },
      })
      await tx.contractActionLog.create({
        data: {
          contractId,
          action: "installment_paid",
          details: JSON.stringify({ molliePaymentId, amount, productType: "rc_fabriquant" }),
        },
      })
    })
    const fresh = await prisma.insuranceContract.findUniqueOrThrow({ where: { id: contractId } })
    return { ok: true, contract: fresh, idempotent: false }
  }

  if (c.status === CONTRACT_STATUS.active && c.paidAt) {
    await ensurePostPaymentPdfsIfMissing(c.id)
    return { ok: true, contract: c, idempotent: true }
  }

  if (c.status !== CONTRACT_STATUS.approved) {
    return { ok: false, error: "INVALID_STATE_FOR_PAYMENT" }
  }

  if (!insuranceContractPaymentAmountMatches(c.productType, c.premium, amount)) {
    await logContractAction(contractId, "payment_amount_mismatch", {
      molliePaymentId,
      expectedPremium: c.premium,
      expectedMollieSlice: mollieExpectedAmountForInsuranceContract(c.productType, c.premium),
      paidAmount: amount,
    })
    return { ok: false, error: "AMOUNT_MISMATCH" }
  }

  const paidAt = new Date()
  const validFrom = paidAt
  const validUntil =
    c.productType === "do"
      ? addYears(paidAt, 10)
      : addYears(paidAt, 1)

  await prisma.$transaction(async (tx) => {
    await tx.contractLifecyclePayment.upsert({
      where: { molliePaymentId },
      create: {
        contractId,
        molliePaymentId,
        amount,
        status: "paid",
        paidAt,
      },
      update: {
        status: "paid",
        paidAt,
      },
    })

    await tx.insuranceContract.update({
      where: { id: contractId },
      data: {
        status: CONTRACT_STATUS.active,
        paidAt,
        validFrom,
        validUntil,
      },
    })

    await tx.contractActionLog.create({
      data: {
        contractId,
        action: "payment_paid",
        details: JSON.stringify({ molliePaymentId, amount }),
      },
    })
  })

  const fresh = await prisma.insuranceContract.findUniqueOrThrow({ where: { id: contractId } })

  try {
    await generatePostPaymentPdfs(contractId, fresh)
  } catch (e) {
    console.error("[insurance-contract] PDF generation:", e)
    await logContractAction(contractId, "pdf_generation_failed", {
      message: e instanceof Error ? e.message : String(e),
    })
    return { ok: false, error: "PDF_GENERATION_FAILED" }
  }

  return { ok: true, contract: fresh, idempotent: false }
}

/**
 * Contrôle que les PDF se génèrent (modèles OK). Ne met pas à jour `ContractStoredDocument`
 * ni les fichiers distants — pour un vrai rafraîchissement stocké, compléter avec la même
 * logique que `generatePostPaymentPdfs` / devis–CP.
 */
export async function regenerateContractPdfs(contractId: string, actorEmail: string) {
  const c = await prisma.insuranceContract.findUnique({ where: { id: contractId } })
  if (!c) throw new Error("NOT_FOUND")
  for (const t of ["quote", "policy", "certificate", "invoice", "schedule"] as const) {
    try {
      await renderContractPdf(c, t)
    } catch {
      /* cert / invoice / échéancier selon statut ou produit */
    }
  }
  await logContractAction(contractId, "pdfs_regenerated", {}, actorEmail)
}
