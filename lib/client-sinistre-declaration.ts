import { getInsuranceProductLabel } from "@/lib/insurance-product"

export const CLIENT_SINISTRE_DESCRIPTION_MIN = 20
export const CLIENT_SINISTRE_DESCRIPTION_MAX = 2000
export const CLIENT_SINISTRE_AMOUNT_MAX = 100_000_000

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  contrat: "Contrat",
  attestation: "Attestation décennale",
  attestation_nominative: "Attestation décennale nominative",
  attestation_do: "Attestation dommage ouvrage",
}

export type ClientSinistreDeclaration = {
  dateSinistre: string
  description: string
  contractNumber: string
  montantEstime: number | null
}

export type ClientSinistreContractOption = {
  number: string
  label: string
}

function parisToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(now)
}

function readAmount(value: unknown): number | null | "invalid" {
  if (value == null || value === "") return null
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(",", ".").trim()) : Number.NaN
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > CLIENT_SINISTRE_AMOUNT_MAX) return "invalid"
  return Math.round(parsed * 100) / 100
}

export function parseClientSinistreDeclaration(
  body: unknown,
  now = new Date()
): { ok: true; value: ClientSinistreDeclaration } | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Déclaration invalide." }
  }
  const payload = body as Record<string, unknown>
  const dateSinistre = typeof payload.dateSinistre === "string" ? payload.dateSinistre.trim() : ""
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateSinistre)) {
    return { ok: false, error: "Indiquez la date du sinistre." }
  }
  const parsed = new Date(`${dateSinistre}T12:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== dateSinistre) {
    return { ok: false, error: "La date du sinistre est invalide." }
  }
  if (dateSinistre > parisToday(now)) {
    return { ok: false, error: "La date du sinistre ne peut pas être dans le futur." }
  }
  if (dateSinistre < "1990-01-01") {
    return { ok: false, error: "La date du sinistre est trop ancienne." }
  }

  const description = typeof payload.description === "string" ? payload.description.trim().replace(/\s+\n/g, "\n") : ""
  if (description.length < CLIENT_SINISTRE_DESCRIPTION_MIN) {
    return { ok: false, error: "Décrivez le sinistre en quelques phrases (20 caractères minimum)." }
  }
  if (description.length > CLIENT_SINISTRE_DESCRIPTION_MAX) {
    return { ok: false, error: "La description est trop longue." }
  }

  const contractNumber =
    typeof payload.contractNumber === "string" ? payload.contractNumber.trim().replace(/\s+/g, " ").slice(0, 80) : ""
  if (contractNumber && !/^[A-Za-z0-9][A-Za-z0-9 ./_-]{0,79}$/.test(contractNumber)) {
    return { ok: false, error: "La référence de contrat est invalide." }
  }

  const montantEstime = readAmount(payload.montantEstime)
  if (montantEstime === "invalid") {
    return { ok: false, error: "Le montant estimé est invalide." }
  }

  return {
    ok: true,
    value: { dateSinistre, description, contractNumber, montantEstime },
  }
}

export function formatEurAmount(amount: number): string {
  return `${Math.round(amount).toLocaleString("fr-FR")} €`
}

/** Texte enregistré sur la fiche, pour distinguer une déclaration client d'un relevé saisi en gestion. */
export function formatClientSinistreDescription(value: ClientSinistreDeclaration): string {
  const lines = ["Déclaration du client"]
  if (value.contractNumber) lines.push(`Contrat : ${value.contractNumber}`)
  if (value.montantEstime != null) lines.push(`Montant estimé : ${formatEurAmount(value.montantEstime)}`)
  lines.push(value.description)
  return lines.join("\n").slice(0, 4000)
}

export function clientSinistreStoredDate(dateSinistre: string): Date {
  return new Date(`${dateSinistre}T12:00:00.000Z`)
}

export function clientSinistreContractOptions(input: {
  contracts: { contractNumber: string; productType: string }[]
  documents: { numero: string; type: string }[]
}): ClientSinistreContractOption[] {
  const seen = new Set<string>()
  const options: ClientSinistreContractOption[] = []
  const push = (number: string, label: string) => {
    const trimmed = number.trim()
    if (!trimmed || seen.has(trimmed)) return
    seen.add(trimmed)
    options.push({ number: trimmed, label })
  }
  for (const contract of input.contracts) {
    push(
      contract.contractNumber,
      `${getInsuranceProductLabel(contract.productType)} — ${contract.contractNumber.trim()}`
    )
  }
  for (const document of input.documents) {
    const typeLabel = DOCUMENT_TYPE_LABELS[document.type]
    if (!typeLabel) continue
    push(document.numero, `${typeLabel} — ${document.numero.trim()}`)
  }
  return options
}
