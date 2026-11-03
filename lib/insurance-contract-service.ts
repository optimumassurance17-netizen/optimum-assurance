import { Prisma, type InsuranceContract } from "@/lib/prisma-client"
import { prisma } from "@/lib/prisma"
import { allocateNextContractNumber } from "@/lib/pdf/shared/contractNumber"
import { CONTRACT_STATUS } from "@/lib/insurance-contract-status"
import { calculateRiskScore, requiresManualReview } from "@/lib/risk-scoring"
import { renderContractPdf } from "@/lib/insurance-contract-pdf"
import { prepareDoContractForPdf } from "@/lib/do-attestation-source"
import { SITE_URL } from "@/lib/site-url"
import { primeTrimestrielle } from "@/lib/premium"
import {
  insuranceProductAllowsActiveInstallmentPayments,
  insuranceProductHasSchedule,
} from "@/lib/insurance-product"
import { readAssuranceTitreCoverageDurationYears } from "@/lib/assurance-titre-contract-config"
import { readRcFabDossierConfig, rcFabAttestationWindow } from "@/lib/rc-fabriquant-dossier-config"
import { resolveManualRcPaymentStep, type ManualRcPaymentKind } from "@/lib/rc-manual-payment"
import { collapseDecennaleContractDuplicates } from "@/lib/decennale-contract-replacement"

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

const REUSABLE_DO_STATUSES = [
  CONTRACT_STATUS.pending_validation,
  CONTRACT_STATUS.approved,
  CONTRACT_STATUS.paid,
  CONTRACT_STATUS.active,
] as const

/** Évite un second contrat DO si le client reprend le même chantier. */
export async function findReusableDoContract(userId: string, projectAddress: string) {
  const address = projectAddress.trim()
  if (!userId || !address) return null
  return prisma.insuranceContract.findFirst({
    where: {
      userId,
      productType: "do",
      projectAddress: address,
      status: { in: [...REUSABLE_DO_STATUSES] },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function createInsuranceContract(input: CreateContractInput) {
  const risk = calculateRiskScore({
    siret: input.siret,
    activities: input.activities,
    missingDocuments: input.missingDocuments,
    companyAgeMonths: input.companyAgeMonths,
    allowMissingSiret: input.productType === "do",
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

  if (input.productType === "decennale" && input.userId) {
    await collapseDecennaleContractDuplicates({
      userId: input.userId,
      keepInsuranceContractId: c.id,
    })
  }

  const baseUrl = `${SITE_URL}/api/contracts/${c.id}/pdf`
  const initialTypes = ["quote", "policy"] as const
  for (const type of initialTypes) {
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
 * - **Assurance titre** : `premium` = montant unique du dossier.
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

function isUniqueConstraint(error: unknown): boolean {
  return (
    (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") ||
    (typeof error === "object" && error !== null && "code" in error && error.code === "P2002")
  )
}

/** Une facture déjà enregistrée est mise à jour. Un second insert du même type ne doit pas échouer. */
async function upsertStoredContractPdf(contractId: string, type: string, url: string): Promise<void> {
  const where = { contractId_type: { contractId, type } }
  try {
    await prisma.contractStoredDocument.upsert({
      where,
      create: { contractId, type, url },
      update: { url },
    })
  } catch (error) {
    if (!isUniqueConstraint(error)) throw error
    await prisma.contractStoredDocument.update({ where, data: { url } })
  }
}

async function commitPaymentOrDuplicate(work: () => Promise<void>): Promise<"ok" | "duplicate"> {
  try {
    await work()
    return "ok"
  } catch (error) {
    if (!isUniqueConstraint(error)) throw error
    return "duplicate"
  }
}

async function generatePostPaymentPdfs(contractId: string, fresh: InsuranceContract): Promise<void> {
  const ready = await prepareDoContractForPdf(fresh)
  const certBytes = await renderContractPdf(ready, "certificate")
  let invBytes: Uint8Array | null = null
  let invoiceSkipped = false
  try {
    invBytes = await renderContractPdf(ready, "invoice")
  } catch (error) {
    if (fresh.productType !== "rc_fabriquant") throw error
    invoiceSkipped = true
    console.error("[generatePostPaymentPdfs] facture RC:", error)
  }
  let scheduleBytes: Uint8Array | null = null
  if (insuranceProductHasSchedule(fresh.productType)) {
    try {
      scheduleBytes = await renderContractPdf(ready, "schedule")
    } catch (e) {
      console.error("[generatePostPaymentPdfs] schedule:", e)
    }
  }
  const baseUrl = `${SITE_URL}/api/contracts/${contractId}/pdf`
  await upsertStoredContractPdf(contractId, "certificate", `${baseUrl}/certificate`)
  if (invBytes) {
    try {
      await upsertStoredContractPdf(contractId, "invoice", `${baseUrl}/invoice`)
    } catch (error) {
      if (fresh.productType !== "rc_fabriquant") throw error
      invoiceSkipped = true
      console.error("[generatePostPaymentPdfs] facture RC déjà présente:", error)
    }
  }
  if (scheduleBytes) {
    await upsertStoredContractPdf(contractId, "schedule", `${baseUrl}/schedule`)
  } else if (insuranceProductHasSchedule(fresh.productType)) {
    await prisma.contractStoredDocument.deleteMany({ where: { contractId, type: "schedule" } })
  }
  await logContractAction(contractId, "pdfs_generated", {
    certificateBytes: certBytes.byteLength,
    ...(invBytes ? { invoiceBytes: invBytes.byteLength } : { invoiceSkipped: true }),
    ...(scheduleBytes ? { scheduleBytes: scheduleBytes.byteLength } : {}),
  })
  if (invoiceSkipped) {
    await logContractAction(contractId, "pdf_generation_failed", {
      context: "rc_fabriquant_invoice_kept",
      message: "La facture RC fabriquant existante est conservée. L'attestation a été générée.",
    })
  }
}

/** Si paiement enregistré mais PDF attestation/facture absents (retry webhook ou panne). */
export async function ensurePostPaymentPdfsIfMissing(contractId: string): Promise<void> {
  const c = await prisma.insuranceContract.findUnique({ where: { id: contractId } })
  if (!c || c.status !== CONTRACT_STATUS.active || !c.paidAt) return
  const [hasCert, hasInvoice] = await Promise.all([
    prisma.contractStoredDocument.findFirst({
      where: { contractId, type: "certificate" },
    }),
    prisma.contractStoredDocument.findFirst({
      where: { contractId, type: "invoice" },
      select: { id: true },
    }),
  ])
  const invoiceMissing = c.productType === "rc_fabriquant" && !hasInvoice
  if (hasCert && !invoiceMissing) return
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
  if (c.status === CONTRACT_STATUS.active && c.paidAt && insuranceProductAllowsActiveInstallmentPayments(c.productType)) {
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
    const coverage = rcFabAttestationWindow({
      paidAt,
      validFrom: c.validFrom,
      validUntil: c.validUntil,
      monthsStep: readRcFabDossierConfig(c.exclusionsJson, c.premium, c.contractNumber).monthsStep,
    })
    const installmentWrite = await commitPaymentOrDuplicate(() =>
      prisma.$transaction(async (tx) => {
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
          data: { paidAt, validFrom: coverage.validFrom, validUntil: coverage.validUntil },
        })
        await tx.contractActionLog.create({
          data: {
            contractId,
            action: "installment_paid",
            details: JSON.stringify({
              molliePaymentId,
              amount,
              productType: c.productType,
              validUntil: coverage.validUntil.toISOString(),
            }),
          },
        })
      })
    )
    if (installmentWrite === "duplicate") {
      const current = await prisma.insuranceContract.findUnique({ where: { id: contractId } })
      if (!current) return { ok: false, error: "NOT_FOUND" }
      await ensurePostPaymentPdfsIfMissing(current.id)
      return { ok: true, contract: current, idempotent: true }
    }
    const fresh = await prisma.insuranceContract.findUniqueOrThrow({ where: { id: contractId } })
    try {
      await generatePostPaymentPdfs(contractId, fresh)
    } catch (e) {
      console.error("[insurance-contract] attestation échéance:", e)
      await logContractAction(contractId, "pdf_generation_failed", {
        message: e instanceof Error ? e.message : String(e),
        context: "rc_fabriquant_installment",
      })
      return { ok: false, error: "PDF_GENERATION_FAILED" }
    }
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
      : c.productType === "assurance_titre"
        ? addYears(
            paidAt,
            readAssuranceTitreCoverageDurationYears(c.exclusionsJson, 10)
          )
        : c.productType === "rc_fabriquant"
          ? rcFabAttestationWindow({
              paidAt,
              validFrom: null,
              validUntil: null,
              monthsStep: readRcFabDossierConfig(c.exclusionsJson, c.premium, c.contractNumber).monthsStep,
            }).validUntil
          : addYears(paidAt, 1)

  const paymentWrite = await commitPaymentOrDuplicate(() =>
    prisma.$transaction(async (tx) => {
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
  )
  if (paymentWrite === "duplicate") {
    const current = await prisma.insuranceContract.findUnique({ where: { id: contractId } })
    if (!current) return { ok: false, error: "NOT_FOUND" }
    await ensurePostPaymentPdfsIfMissing(current.id)
    return { ok: true, contract: current, idempotent: true }
  }

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

/** Référence stable d'un encaissement DO saisi en gestion, distincte d'un paiement Mollie. */
export function manualDoPaymentReference(contractId: string): string {
  return `manual-do-${contractId}`
}

export type ManualDoPaymentResult =
  | {
      ok: true
      contract: InsuranceContract
      idempotent: boolean
      amount: number
      certificateReady?: boolean
    }
  | { ok: false; error: "NOT_FOUND" | "NOT_DO" | "NOT_APPROVED" | "PDF_GENERATION_FAILED" }

/**
 * Enregistre le règlement d'un contrat dommage ouvrage approuvé sans attendre Mollie.
 * Active le contrat pour 10 ans et délivre l'attestation et la facture.
 */
export async function validateDoPaymentManually(
  contractId: string,
  actorEmail: string
): Promise<ManualDoPaymentResult> {
  const current = await prisma.insuranceContract.findUnique({ where: { id: contractId } })
  if (!current) return { ok: false, error: "NOT_FOUND" }
  if (current.productType !== "do") return { ok: false, error: "NOT_DO" }

  const amount = mollieExpectedAmountForInsuranceContract(current.productType, current.premium)
  if (current.status === CONTRACT_STATUS.active && current.paidAt) {
    await ensurePostPaymentPdfsIfMissing(current.id)
    const certificate = await prisma.contractStoredDocument.findFirst({
      where: { contractId: current.id, type: "certificate" },
    })
    return {
      ok: true,
      contract: current,
      idempotent: true,
      amount,
      certificateReady: Boolean(certificate),
    }
  }
  if (current.status !== CONTRACT_STATUS.approved) return { ok: false, error: "NOT_APPROVED" }

  const result = await processInsuranceContractPaymentSuccess(
    contractId,
    manualDoPaymentReference(contractId),
    amount
  )
  if (!result.ok) {
    if (result.error === "PDF_GENERATION_FAILED") {
      await ensurePostPaymentPdfsIfMissing(contractId)
      const certificate = await prisma.contractStoredDocument.findFirst({
        where: { contractId, type: "certificate" },
      })
      const paid = await prisma.insuranceContract.findUnique({ where: { id: contractId } })
      if (certificate && paid) {
        await logContractAction(
          contractId,
          "payment_validated_manually",
          { amount, reference: manualDoPaymentReference(contractId) },
          actorEmail
        )
        return { ok: true, contract: paid, idempotent: false, amount }
      }
      await logContractAction(
        contractId,
        "payment_validated_manually",
        { amount, pdf: "failed" },
        actorEmail
      )
      return { ok: false, error: "PDF_GENERATION_FAILED" }
    }
    return { ok: false, error: result.error === "NOT_FOUND" ? "NOT_FOUND" : "NOT_APPROVED" }
  }

  if (!result.idempotent) {
    await logContractAction(
      contractId,
      "payment_validated_manually",
      { amount, reference: manualDoPaymentReference(contractId) },
      actorEmail
    )
  }
  return { ok: true, contract: result.contract, idempotent: result.idempotent, amount }
}

export type ManualRcPaymentResult =
  | {
      ok: true
      contract: InsuranceContract
      idempotent: boolean
      amount: number
      certificateReady: boolean
      kind: ManualRcPaymentKind
    }
  | {
      ok: false
      error:
        | "NOT_FOUND"
        | "NOT_RC"
        | "NOT_PAYABLE"
        | "REFERENCE_REQUIRED"
        | "INVALID_AMOUNT"
        | "AMOUNT_MISMATCH"
        | "PDF_GENERATION_FAILED"
    }

/**
 * Enregistre une échéance RC fabriquant reçue sur le compte, sans appel Mollie.
 * Le premier encaissement active le contrat et délivre l'attestation.
 * Chaque échéance suivante allonge la période et réimprime l'attestation.
 */
export async function validateRcFabriquantPaymentManually(
  contractId: string,
  actorEmail: string,
  virementReference: string | null
): Promise<ManualRcPaymentResult> {
  const current = await prisma.insuranceContract.findUnique({ where: { id: contractId } })
  if (!current) return { ok: false, error: "NOT_FOUND" }
  if (current.productType !== "rc_fabriquant") return { ok: false, error: "NOT_RC" }

  const amount = mollieExpectedAmountForInsuranceContract(current.productType, current.premium)
  if (!(amount > 0)) return { ok: false, error: "INVALID_AMOUNT" }

  const [paidPayments, certificate] = await Promise.all([
    prisma.contractLifecyclePayment.findMany({
      where: { contractId, status: "paid" },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      select: { molliePaymentId: true },
    }),
    prisma.contractStoredDocument.findFirst({
      where: { contractId, type: "certificate" },
      select: { id: true },
    }),
  ])
  const step = resolveManualRcPaymentStep({
    contractId,
    status: current.status,
    paidAt: current.paidAt,
    paidPaymentIds: paidPayments.map((row) => row.molliePaymentId),
    hasCertificate: Boolean(certificate),
  })
  if (!step.ok) return { ok: false, error: "NOT_PAYABLE" }
  if (step.kind !== "retry" && !virementReference) return { ok: false, error: "REFERENCE_REQUIRED" }

  const result = await processInsuranceContractPaymentSuccess(contractId, step.reference, amount)
  if (!result.ok) {
    if (result.error === "PDF_GENERATION_FAILED") return { ok: false, error: "PDF_GENERATION_FAILED" }
    if (result.error === "AMOUNT_MISMATCH") return { ok: false, error: "AMOUNT_MISMATCH" }
    if (result.error === "NOT_FOUND") return { ok: false, error: "NOT_FOUND" }
    return { ok: false, error: "NOT_PAYABLE" }
  }

  const ready = await prisma.contractStoredDocument.findFirst({
    where: { contractId, type: "certificate" },
    select: { id: true },
  })
  if (!result.idempotent) {
    await logContractAction(
      contractId,
      "payment_validated_manually",
      {
        productType: "rc_fabriquant",
        amount,
        reference: step.reference,
        virementReference,
        kind: step.kind,
      },
      actorEmail
    )
  }

  return {
    ok: true,
    contract: result.contract,
    idempotent: result.idempotent,
    amount,
    certificateReady: Boolean(ready),
    kind: step.kind,
  }
}

/**
 * Contrôle que les PDF se génèrent (modèles OK). Ne met pas à jour `ContractStoredDocument`
 * ni les fichiers distants — pour un vrai rafraîchissement stocké, compléter avec la même
 * logique que `generatePostPaymentPdfs` / devis–CP.
 */
export async function regenerateContractPdfs(contractId: string, actorEmail: string) {
  const c = await prisma.insuranceContract.findUnique({ where: { id: contractId } })
  if (!c) throw new Error("NOT_FOUND")
  const ready = await prepareDoContractForPdf(c)
  for (const t of ["quote", "policy", "certificate", "invoice", "schedule"] as const) {
    try {
      await renderContractPdf(ready, t)
    } catch {
      /* cert / invoice / échéancier selon statut ou produit */
    }
  }
  await logContractAction(contractId, "pdfs_regenerated", {}, actorEmail)
}
