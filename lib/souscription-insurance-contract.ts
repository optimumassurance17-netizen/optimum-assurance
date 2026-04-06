import type { DoSouscriptionInsurancePayload, SouscriptionData } from "@/lib/types"
import { STORAGE_KEYS } from "@/lib/types"
import { CONTRACT_STATUS } from "@/lib/insurance-contract-status"
import type { InsuranceContractSnapshot } from "@/lib/insurance-contract-types"

function parseInsuranceSnapshotFromSession(): InsuranceContractSnapshot | null {
  if (typeof sessionStorage === "undefined") return null
  const raw = sessionStorage.getItem(STORAGE_KEYS.insuranceContract)
  if (!raw) return null
  try {
    const p = JSON.parse(raw) as Partial<InsuranceContractSnapshot>
    if (p?.contractId && p?.contractNumber && p?.status) {
      return {
        contractId: p.contractId,
        contractNumber: p.contractNumber,
        status: p.status,
        rejectedReason: p.rejectedReason,
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

async function tryMollieRedirectIfApproved(contractId: string): Promise<
  { outcome: "mollie_redirect"; checkoutUrl: string } | { outcome: "continue_flow" }
> {
  const pay = await startMollieInsurancePayment(contractId)
  if (pay.ok) {
    persistMollieInsurancePaymentId(pay.paymentId)
    return { outcome: "mollie_redirect", checkoutUrl: pay.checkoutUrl }
  }
  console.warn("[souscription] paiement Mollie non démarré:", pay.error)
  return { outcome: "continue_flow" }
}

async function resumeInsuranceContractFlowFromSnapshot(
  snapshot: InsuranceContractSnapshot
): Promise<{ outcome: "mollie_redirect"; checkoutUrl: string } | { outcome: "continue_flow" }> {
  const { contractId, contractNumber, status, rejectedReason } = snapshot
  persistInsuranceContractSnapshot({
    contractId,
    contractNumber,
    status,
    rejectedReason,
  })

  if (status === CONTRACT_STATUS.rejected) {
    return { outcome: "continue_flow" }
  }

  if (status === CONTRACT_STATUS.approved) {
    return tryMollieRedirectIfApproved(contractId)
  }

  return { outcome: "continue_flow" }
}

export function companyAgeMonthsFromDateIso(dateCreationSociete?: string | null): number | null {
  const raw = dateCreationSociete?.trim()
  if (!raw) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  const months = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  return Math.max(0, Math.floor(months))
}

export function companyAgeMonthsFromSouscription(data: SouscriptionData): number | null {
  return companyAgeMonthsFromDateIso(data.dateCreationSociete)
}

export function isDoSouscriptionPayload(
  data: SouscriptionData | DoSouscriptionInsurancePayload
): data is DoSouscriptionInsurancePayload {
  return (data as DoSouscriptionInsurancePayload).productType === "do"
}

export function buildAddressLine(
  data: Pick<SouscriptionData | DoSouscriptionInsurancePayload, "adresse" | "codePostal" | "ville">
): string {
  const parts = [data.adresse?.trim(), data.codePostal?.trim(), data.ville?.trim()].filter(Boolean)
  return parts.join(", ")
}

export type CreateInsuranceFromSouscriptionOk = {
  contractId: string
  contractNumber: string
  status: string
  riskScore: number
  riskReasons: string[]
  rejectedReason: string | null
}

export type CreateInsuranceFromSouscriptionResult =
  | { ok: true; contract: CreateInsuranceFromSouscriptionOk }
  | { ok: false; error: string }

export async function createInsuranceContractFromDoPayload(
  data: DoSouscriptionInsurancePayload
): Promise<CreateInsuranceFromSouscriptionResult> {
  const premium = data.premium
  if (premium == null || premium <= 0) {
    return { ok: false, error: "Prime manquante ou invalide" }
  }
  const siret = (data.siret || "").replace(/\D/g, "")
  if (siret.length !== 14) {
    return { ok: false, error: "SIRET invalide (14 chiffres requis)" }
  }
  const address = buildAddressLine(data)
  if (!address.trim()) {
    return { ok: false, error: "Adresse complète requise" }
  }
  if (!data.projectName?.trim() || !data.projectAddress?.trim()) {
    return { ok: false, error: "Chantier (nom et adresse) requis" }
  }

  const res = await fetch("/api/contracts/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productType: "do",
      clientName: data.raisonSociale.trim(),
      siret,
      address,
      premium,
      projectName: data.projectName.trim(),
      projectAddress: data.projectAddress.trim(),
      constructionNature: data.constructionNature?.trim(),
      activities: data.constructionNature?.trim() ? [data.constructionNature.trim()] : undefined,
      missingDocuments: false,
      companyAgeMonths: companyAgeMonthsFromDateIso(data.dateCreationSociete),
    }),
  })

  const json = (await res.json().catch(() => ({}))) as {
    error?: string
    contract?: {
      id: string
      contractNumber: string
      status: string
      riskScore: number
      riskReasons: string[]
      rejectedReason: string | null
    }
  }

  if (!res.ok || !json.contract) {
    return {
      ok: false,
      error: typeof json.error === "string" ? json.error : "Erreur lors de la création du contrat",
    }
  }

  const c = json.contract
  return {
    ok: true,
    contract: {
      contractId: c.id,
      contractNumber: c.contractNumber,
      status: c.status,
      riskScore: c.riskScore,
      riskReasons: c.riskReasons ?? [],
      rejectedReason: c.rejectedReason ?? null,
    },
  }
}

export async function createInsuranceContractFromSouscription(
  data: SouscriptionData
): Promise<CreateInsuranceFromSouscriptionResult> {
  const premium = data.tarif?.primeAnnuelle
  if (premium == null || premium <= 0) {
    return { ok: false, error: "Tarif manquant ou invalide" }
  }
  const siret = (data.siret || "").replace(/\D/g, "")
  if (siret.length !== 14) {
    return { ok: false, error: "SIRET invalide (14 chiffres requis)" }
  }
  const address = buildAddressLine(data)
  if (!address.trim()) {
    return { ok: false, error: "Adresse complète requise" }
  }
  if (!data.activites?.length) {
    return { ok: false, error: "Aucune activité renseignée" }
  }

  const res = await fetch("/api/contracts/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productType: "decennale",
      clientName: data.raisonSociale.trim(),
      siret,
      address,
      activities: data.activites,
      exclusions: data.exclusionsActivites?.length ? data.exclusionsActivites : undefined,
      premium,
      missingDocuments: false,
      companyAgeMonths: companyAgeMonthsFromSouscription(data),
    }),
  })

  const json = (await res.json().catch(() => ({}))) as {
    error?: string
    contract?: {
      id: string
      contractNumber: string
      status: string
      riskScore: number
      riskReasons: string[]
      rejectedReason: string | null
    }
  }

  if (!res.ok || !json.contract) {
    return {
      ok: false,
      error: typeof json.error === "string" ? json.error : "Erreur lors de la création du contrat",
    }
  }

  const c = json.contract
  return {
    ok: true,
    contract: {
      contractId: c.id,
      contractNumber: c.contractNumber,
      status: c.status,
      riskScore: c.riskScore,
      riskReasons: c.riskReasons ?? [],
      rejectedReason: c.rejectedReason ?? null,
    },
  }
}

export async function startMollieInsurancePayment(contractId: string): Promise<
  { ok: true; checkoutUrl: string; paymentId: string } | { ok: false; error: string }
> {
  const res = await fetch("/api/contracts/pay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contractId }),
  })
  const json = (await res.json().catch(() => ({}))) as {
    error?: string
    checkoutUrl?: string
    id?: string
  }
  if (!res.ok) {
    return { ok: false, error: typeof json.error === "string" ? json.error : "Erreur paiement" }
  }
  const checkoutUrl = json.checkoutUrl
  const paymentId = json.id
  if (!checkoutUrl || typeof checkoutUrl !== "string") {
    return { ok: false, error: "Lien de paiement indisponible" }
  }
  if (!paymentId || typeof paymentId !== "string") {
    return { ok: false, error: "Identifiant paiement manquant" }
  }
  return { ok: true, checkoutUrl, paymentId }
}

/** Avant redirection Mollie — retrouver le paiement sur /confirmation */
export function persistMollieInsurancePaymentId(paymentId: string) {
  if (typeof sessionStorage === "undefined") return
  sessionStorage.setItem("mollie_payment_id", paymentId)
  sessionStorage.setItem("mollie_payment_type", "insurance_contract")
}

export function persistInsuranceContractSnapshot(payload: {
  contractId: string
  contractNumber: string
  status: string
  rejectedReason?: string | null
}) {
  if (typeof sessionStorage === "undefined") return
  sessionStorage.setItem(STORAGE_KEYS.insuranceContract, JSON.stringify(payload))
}

/**
 * Après souscription : crée le contrat Prisma, oriente vers Mollie si approuvé, sinon laisse le parcours (signature).
 */
export async function runInsuranceContractStepAfterSouscription(
  data: SouscriptionData | DoSouscriptionInsurancePayload
): Promise<
  | { outcome: "mollie_redirect"; checkoutUrl: string }
  | { outcome: "continue_flow" }
> {
  if (typeof sessionStorage !== "undefined") {
    const sessionCreatedId = sessionStorage.getItem(STORAGE_KEYS.insuranceContractSessionCreatedId)
    const snapshot = parseInsuranceSnapshotFromSession()
    if (sessionCreatedId && !snapshot) {
      sessionStorage.removeItem(STORAGE_KEYS.insuranceContractSessionCreatedId)
    }
    if (sessionCreatedId && snapshot?.contractId === sessionCreatedId) {
      return resumeInsuranceContractFlowFromSnapshot(snapshot)
    }
  }

  const created = isDoSouscriptionPayload(data)
    ? await createInsuranceContractFromDoPayload(data)
    : await createInsuranceContractFromSouscription(data)
  if (!created.ok) {
    console.warn("[souscription] contrat assurance non créé:", created.error)
    return { outcome: "continue_flow" }
  }

  const { contractId, contractNumber, status, rejectedReason } = created.contract
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(STORAGE_KEYS.insuranceContractSessionCreatedId, contractId)
  }
  persistInsuranceContractSnapshot({
    contractId,
    contractNumber,
    status,
    rejectedReason,
  })

  if (status === CONTRACT_STATUS.rejected) {
    return { outcome: "continue_flow" }
  }

  if (status === CONTRACT_STATUS.approved) {
    return tryMollieRedirectIfApproved(contractId)
  }

  return { outcome: "continue_flow" }
}
