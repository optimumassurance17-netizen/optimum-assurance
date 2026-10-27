import { buildOptimizedExclusionSummary } from "@/lib/optimized-exclusions"

/** L'attestation reprend le contrat qui vient d'être modifié, sans changer son numéro ni son QR. */

export type ContractAttestationSnapshot = {
  product: "do" | "decennale"
  contractNumber: string
  raisonSociale: string
  siret?: string
  adresse?: string
  codePostal?: string
  ville?: string
  clearLocality?: boolean
  activites?: string[]
  exclusions?: string[]
  primeAnnuelle?: number
  franchise?: number
  plafond?: number
  chiffreAffaires?: number
  dateEffet?: string
  dateEcheance?: string
  adresseOperation?: string
  coutConstruction?: number | null
}

export type AttestationAlignRow = {
  id: string
  type: string
  status: string
  createdAt: Date
  data: Record<string, unknown>
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function sameText(left: string | null | undefined, right: string | null | undefined): boolean {
  return (left || "").replace(/\s+/g, " ").trim().toLowerCase() === (right || "").replace(/\s+/g, " ").trim().toLowerCase()
}

export function attestationContractReference(data: Record<string, unknown>): string {
  return text(data.sourceContractNumero) || text(data.sourceContractNumber) || text(data.alignedWithContractNumero)
}

function identityMatches(
  row: AttestationAlignRow,
  snapshot: ContractAttestationSnapshot,
  previous: { clientName?: string | null; projectAddress?: string | null }
): boolean {
  if (snapshot.product === "do") {
    const address = text(row.data.adresseOperation) || text(row.data.projectAddress)
    return (
      sameText(address, previous.projectAddress) ||
      sameText(address, snapshot.adresseOperation) ||
      sameText(text(row.data.raisonSociale), previous.clientName)
    )
  }
  const name = text(row.data.raisonSociale)
  return sameText(name, previous.clientName) || sameText(name, snapshot.raisonSociale)
}

/** La dernière attestation du contrat modifié, pas les attestations liées à un autre numéro. */
export function selectAttestationsToAlign(
  rows: AttestationAlignRow[],
  snapshot: ContractAttestationSnapshot,
  previous: { clientName?: string | null; projectAddress?: string | null } = {}
): AttestationAlignRow[] {
  const types = snapshot.product === "do" ? ["attestation_do"] : ["attestation", "attestation_nominative"]
  const selected: AttestationAlignRow[] = []
  for (const type of types) {
    const ofType = rows.filter((row) => row.type === type && row.status !== "resilie")
    const linked = ofType.filter((row) => attestationContractReference(row.data) === snapshot.contractNumber)
    selected.push(...linked)
    const unbound = ofType.filter((row) => !attestationContractReference(row.data) && identityMatches(row, snapshot, previous))
    const latestUnbound = [...unbound].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
    if (latestUnbound && !selected.some((row) => row.id === latestUnbound.id)) {
      selected.push(latestUnbound)
      continue
    }
    if (linked.length === 0 && !latestUnbound && ofType.length === 1 && !attestationContractReference(ofType[0].data)) {
      selected.push(ofType[0])
    }
  }
  return selected
}

export function alignAttestationWithContract(
  current: Record<string, unknown>,
  snapshot: ContractAttestationSnapshot
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...current, alignedWithContractNumero: snapshot.contractNumber }
  if (snapshot.raisonSociale.trim()) next.raisonSociale = snapshot.raisonSociale.trim()

  if (snapshot.product === "do") {
    const chantier = snapshot.adresseOperation?.trim() || ""
    if (chantier) {
      next.adresseOperation = chantier
      next.projectAddress = chantier
      next.adresseConstruction = chantier
      next.adresseChantier = chantier
      if (next.operation && typeof next.operation === "object" && !Array.isArray(next.operation)) {
        next.operation = { ...(next.operation as Record<string, unknown>), adresseChantier: chantier }
      }
    }
    if (typeof snapshot.primeAnnuelle === "number" && Number.isFinite(snapshot.primeAnnuelle)) {
      next.primeAnnuelle = snapshot.primeAnnuelle
    }
    if (typeof snapshot.coutConstruction === "number" && Number.isFinite(snapshot.coutConstruction)) {
      next.coutConstruction = snapshot.coutConstruction
    }
    return next
  }

  if (snapshot.siret?.trim()) next.siret = snapshot.siret.trim()
  if (snapshot.adresse?.trim()) next.adresse = snapshot.adresse.trim()
  if (snapshot.clearLocality) {
    next.codePostal = ""
    next.ville = ""
  } else {
    if (snapshot.codePostal !== undefined) next.codePostal = snapshot.codePostal
    if (snapshot.ville !== undefined) next.ville = snapshot.ville
  }
  if (snapshot.activites && snapshot.activites.length > 0) {
    next.activites = snapshot.activites
    const exclusions = snapshot.exclusions?.length
      ? snapshot.exclusions
      : buildOptimizedExclusionSummary(snapshot.activites).lines
    next.exclusionsOptimisees = exclusions
    next.activityExclusions = exclusions
    next.exclusions = exclusions
  }
  if (typeof snapshot.primeAnnuelle === "number" && Number.isFinite(snapshot.primeAnnuelle)) {
    next.primeAnnuelle = snapshot.primeAnnuelle
  }
  if (typeof snapshot.franchise === "number" && Number.isFinite(snapshot.franchise)) next.franchise = snapshot.franchise
  if (typeof snapshot.plafond === "number" && Number.isFinite(snapshot.plafond)) next.plafond = snapshot.plafond
  if (typeof snapshot.chiffreAffaires === "number" && Number.isFinite(snapshot.chiffreAffaires)) {
    next.chiffreAffaires = snapshot.chiffreAffaires
  }
  if (snapshot.dateEffet?.trim()) next.dateEffet = snapshot.dateEffet.trim()
  if (snapshot.dateEcheance?.trim()) next.dateEcheance = snapshot.dateEcheance.trim()
  next.sourceContractNumero = snapshot.contractNumber
  if (current.attestationNominative === true) next.sourceContractNumber = snapshot.contractNumber
  return next
}
