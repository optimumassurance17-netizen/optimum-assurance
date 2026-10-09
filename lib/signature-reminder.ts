function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function parseContractData(raw: string): Record<string, unknown> {
  try {
    return asObject(JSON.parse(raw || "{}"))
  } catch {
    return {}
  }
}

function isoDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toISOString()
}

export function productSignatureLabel(productType: string | null | undefined): string {
  if (productType === "do" || productType === "dommage-ouvrage") return "Dommage ouvrage"
  if (productType === "rc_fabriquant") return "RC Fabriquant"
  if (productType === "assurance_titre") return "Assurance titre"
  if (productType === "decennale") return "Décennale"
  return "Contrat"
}

/** Lien de signature déjà créé. Ne crée pas de nouvelle demande. */
export function signatureReminderPayload(
  pending: { contractData: string; contractNumero: string; signatureRequestId: string },
  userLabel: string,
  siteUrl: string
): {
  raisonSociale: string
  signatureLink: string
  produitLabel: string
  reference?: string
} {
  const data = parseContractData(pending.contractData)
  const custom = data.customUploadedDevisFlow === true
  const produitLabelRaw = typeof data.produitLabel === "string" ? data.produitLabel.trim() : ""
  const produitLabel = custom ? produitLabelRaw || "proposition commerciale" : "contrat décennale"
  const referenceRaw =
    typeof data.devisReference === "string" ? data.devisReference.trim() : pending.contractNumero.trim()
  const legacyNextPath = typeof data.afterSignNextPath === "string" ? data.afterSignNextPath.trim() : ""
  const nextPathRaw = custom ? legacyNextPath : "/mandat-sepa"
  const nextPath =
    nextPathRaw.startsWith("/") && !nextPathRaw.startsWith("//")
      ? nextPathRaw
      : custom
        ? "/espace-client"
        : "/mandat-sepa"
  const base = siteUrl.replace(/\/$/, "")
  return {
    raisonSociale: userLabel,
    signatureLink: `${base}/sign/${pending.signatureRequestId}?next=${encodeURIComponent(nextPath)}`,
    produitLabel,
    reference: referenceRaw || undefined,
  }
}

export type ClientSignatureContract = {
  label: string
  numero: string
  signedAt: string
}

export type ClientSignaturePending = {
  signatureRequestId: string
  label: string
  numero: string
  createdAt: string
}

export type ClientSignatureState = {
  signed: boolean
  summary: "Contrat signé" | "Contrat non signé"
  contracts: ClientSignatureContract[]
  pending: ClientSignaturePending[]
}

export function describeClientSignature(input: {
  documents: { type: string; numero: string; status: string; createdAt: Date | string }[]
  insuranceContracts: { productType: string; contractNumber: string; createdAt: Date | string }[]
  pending: { signatureRequestId: string; contractNumero: string; contractData: string; createdAt: Date | string }[]
}): ClientSignatureState {
  const contracts: ClientSignatureContract[] = []
  for (const document of input.documents) {
    if (document.type !== "contrat" || document.status === "resilie") continue
    const signedAt = isoDate(document.createdAt)
    if (!signedAt) continue
    contracts.push({ label: "Décennale", numero: document.numero, signedAt })
  }
  for (const contract of input.insuranceContracts) {
    const signedAt = isoDate(contract.createdAt)
    if (!signedAt || !contract.contractNumber.trim()) continue
    contracts.push({
      label: productSignatureLabel(contract.productType),
      numero: contract.contractNumber,
      signedAt,
    })
  }
  const pending: ClientSignaturePending[] = []
  for (const row of input.pending) {
    const createdAt = isoDate(row.createdAt)
    if (!row.signatureRequestId.trim() || !createdAt) continue
    const data = parseContractData(row.contractData)
    const custom = data.customUploadedDevisFlow === true
    const produitLabelRaw = typeof data.produitLabel === "string" ? data.produitLabel.trim() : ""
    pending.push({
      signatureRequestId: row.signatureRequestId,
      label: custom ? produitLabelRaw || "Proposition commerciale" : "Décennale",
      numero: row.contractNumero,
      createdAt,
    })
  }
  return {
    signed: contracts.length > 0,
    summary: contracts.length > 0 ? "Contrat signé" : "Contrat non signé",
    contracts,
    pending,
  }
}
