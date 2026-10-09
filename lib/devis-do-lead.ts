import { TYPES_OUVRAGE, type DestinationConstruction } from "@/lib/dommage-ouvrage-types"

/** Ancre du bloc « Demandes devis dommage ouvrage » sur /gestion. */
export const DO_DEVIS_LEADS_SECTION_ID = "demandes-devis-do"

const DESTINATION_LABELS: Record<DestinationConstruction, string> = {
  location: "Location",
  vente: "Vente",
  exploitation_directe: "Exploitation directe",
}

const DO_DEVIS_ACTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
const DO_DEVIS_ACTION_LIMIT = 8
const LEAD_ID_PATTERN = /^[A-Za-z0-9_-]{8,80}$/

export function foldSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function readDoLeadRecord(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw?.trim()) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

function readTrimmed(record: Record<string, unknown> | null, key: string, max: number): string | null {
  const value = record?.[key]
  if (typeof value !== "string") return null
  const trimmed = value.trim().replace(/\s+/g, " ")
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

export function readDoLeadCompanyName(raw: string | null | undefined): string | null {
  return readTrimmed(readDoLeadRecord(raw), "raisonSociale", 160)
}

export type DoLeadChantier = {
  typeOuvrage: string | null
  destination: string | null
  ville: string | null
  telephone: string | null
}

export function readDoLeadChantier(raw: string | null | undefined): DoLeadChantier {
  const record = readDoLeadRecord(raw)
  const typeCode = readTrimmed(record, "typeOuvrage", 80)
  const destinationCode = readTrimmed(record, "destinationConstruction", 80)
  const typeOuvrage = typeCode
    ? (TYPES_OUVRAGE.find((item) => item.value === typeCode)?.label ?? null)
    : null
  const destination =
    destinationCode && destinationCode in DESTINATION_LABELS
      ? DESTINATION_LABELS[destinationCode as DestinationConstruction]
      : null
  return {
    typeOuvrage,
    destination,
    ville: readTrimmed(record, "villeConstruction", 80) ?? readTrimmed(record, "ville", 80),
    telephone: readTrimmed(record, "telephone", 30),
  }
}

export function doDevisLeadRowId(leadId: string): string {
  const id = leadId.trim()
  if (!LEAD_ID_PATTERN.test(id)) return DO_DEVIS_LEADS_SECTION_ID
  return `demande-do-${id}`
}

export function doDevisLeadGestionUrl(siteUrl: string, leadId?: string | null): string {
  const base = siteUrl.replace(/\/$/, "")
  return `${base}/gestion#${doDevisLeadRowId(leadId ?? "")}`
}

export type DoLeadSearchFields = {
  email: string
  raisonSociale?: string | null
  chantier?: DoLeadChantier | null
}

export function doLeadMatchesSearch(lead: DoLeadSearchFields, query: string): boolean {
  const folded = foldSearchText(query)
  if (!folded) return true
  const chantier = lead.chantier
  const fields = [
    lead.email,
    lead.raisonSociale ?? "",
    chantier?.typeOuvrage ?? "",
    chantier?.destination ?? "",
    chantier?.ville ?? "",
    chantier?.telephone ?? "",
  ]
  if (fields.some((field) => foldSearchText(field).includes(folded))) return true
  const queryDigits = query.replace(/\D/g, "")
  const phoneDigits = (chantier?.telephone ?? "").replace(/\D/g, "")
  return queryDigits.length >= 4 && phoneDigits.includes(queryDigits)
}

/** Sans recherche : seulement les demandes sans fiche. Avec recherche : toutes les demandes qui correspondent. */
export function visibleDoDevisLeads<T extends DoLeadSearchFields>(
  leads: T[],
  knownEmails: ReadonlySet<string>,
  query: string
): T[] {
  return leads.filter((lead) => {
    if (!doLeadMatchesSearch(lead, query)) return false
    if (query.trim()) return true
    const email = lead.email.trim().toLowerCase()
    return Boolean(email) && !knownEmails.has(email)
  })
}

export type DoDevisLeadActionInput = {
  id: string
  email: string
  data?: string | null
  createdAt: Date
}

export type DoDevisDashboardAction = {
  id: string
  kind: "do_devis_pending"
  priority: "high" | "medium"
  title: string
  description: string
  href: string
  ageHours: number
  leadId: string
}

/**
 * Demandes DO récentes sans fiche client. Le plus récent reste en tête.
 * Aucun e-mail et aucun compte ne sont créés ici.
 */
export function selectDoDevisDashboardActions(
  leads: DoDevisLeadActionInput[],
  knownEmails: ReadonlySet<string>,
  now: Date
): DoDevisDashboardAction[] {
  const windowStart = now.getTime() - DO_DEVIS_ACTION_WINDOW_MS
  return leads
    .filter((lead) => {
      const created = lead.createdAt.getTime()
      if (!Number.isFinite(created) || created < windowStart) return false
      const email = lead.email.trim().toLowerCase()
      if (!email) return false
      return !knownEmails.has(email)
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, DO_DEVIS_ACTION_LIMIT)
    .map((lead) => {
      const company = readDoLeadCompanyName(lead.data)
      const email = lead.email.trim()
      const ageHours = Math.max(0, Math.floor((now.getTime() - lead.createdAt.getTime()) / (60 * 60 * 1000)))
      return {
        id: `lead-do-${lead.id}`,
        kind: "do_devis_pending",
        priority: ageHours >= 72 ? "high" : "medium",
        title: "Demande devis dommage ouvrage",
        description: company ? `${company} — ${email}` : email,
        href: `#${doDevisLeadRowId(lead.id)}`,
        ageHours,
        leadId: lead.id,
      }
    })
}
