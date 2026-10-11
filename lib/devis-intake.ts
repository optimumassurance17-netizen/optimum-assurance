import { foldSearchText, readDoLeadCompanyName } from "@/lib/devis-do-lead"
import { constructionAddressFromLead, readDoLeadConstructionCost } from "@/lib/do-attestation-facts"

export function normalizeIntakeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function asRecord(data: unknown): Record<string, unknown> | null {
  if (typeof data === "string") {
    if (!data.trim()) return null
    try {
      const parsed = JSON.parse(data) as unknown
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
      return parsed as Record<string, unknown>
    } catch {
      return null
    }
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return null
  return data as Record<string, unknown>
}

function digits(value: unknown): string {
  return typeof value === "string" ? value.replace(/\D/g, "").slice(0, 14) : ""
}

function text(value: unknown): string {
  return typeof value === "string" ? foldSearchText(value) : ""
}

/** Même email et même chantier : une seule demande DO. */
export function doDevisMatchKey(input: {
  email: string
  data: unknown
  coutTotal?: number | null
}): string {
  const email = normalizeIntakeEmail(input.email)
  const record = asRecord(input.data)
  const address = foldSearchText(constructionAddressFromLead(record))
  if (address) return `${email}|addr|${address}`
  const raw = typeof input.data === "string" ? input.data : JSON.stringify(record ?? {})
  const company = foldSearchText(readDoLeadCompanyName(raw) ?? "")
  const cost = Math.round(input.coutTotal ?? readDoLeadConstructionCost(record) ?? 0)
  if (company) return `${email}|co|${company}|${cost}`
  return `${email}|same`
}

/** Même email et même SIRET, sinon même société. */
export function decennaleDevisMatchKey(input: {
  email: string
  siret?: string | null
  raisonSociale?: string | null
}): string {
  const email = normalizeIntakeEmail(input.email)
  const siret = digits(input.siret ?? "")
  if (siret.length === 14) return `${email}|siret|${siret}`
  const company = text(input.raisonSociale)
  if (company) return `${email}|co|${company}`
  return `${email}|same`
}

/** Même email et même SIRET. */
export function rcDevisMatchKey(input: { email: string; siret?: string | null; data?: unknown }): string {
  const email = normalizeIntakeEmail(input.email)
  const record = asRecord(input.data)
  const siret = digits(input.siret ?? "") || digits(record?.siret)
  if (siret) return `${email}|siret|${siret}`
  return `${email}|same`
}

/** Même email et même sujet d'étude. */
export function etudeDevisMatchKey(input: { email: string; data: unknown }): string {
  const email = normalizeIntakeEmail(input.email)
  const record = asRecord(input.data) ?? {}
  const type = text(record.type)
  const description = text(record.descriptionActivite)
  const activities = Array.isArray(record.activites)
    ? record.activites.map((item) => text(item)).filter(Boolean).sort().join(",")
    : ""
  return `${email}|${type}|${description || activities || "same"}`
}

/** Même email, même opération et même adresse du bien. */
export function titreDevisMatchKey(input: { email: string; data: unknown }): string {
  const email = normalizeIntakeEmail(input.email)
  const record = asRecord(input.data) ?? {}
  const operation = text(record.typeOperation)
  const address = foldSearchText(
    [record.adresseBien, record.codePostalBien, record.villeBien]
      .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
      .join(" ")
  )
  if (address) return `${email}|${operation}|${address}`
  return `${email}|${operation}|same`
}

export function findFirstMatchingKey<T>(rows: T[], keyOf: (row: T) => string, key: string): T | null {
  return rows.find((row) => keyOf(row) === key) ?? null
}
