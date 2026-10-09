/** Ancre du bloc « Demandes devis dommage ouvrage » sur /gestion. */
export const DO_DEVIS_LEADS_SECTION_ID = "demandes-devis-do"

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

export function readDoLeadCompanyName(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
    const name = (parsed as { raisonSociale?: unknown }).raisonSociale
    if (typeof name !== "string") return null
    const trimmed = name.trim().replace(/\s+/g, " ")
    if (!trimmed) return null
    return trimmed.slice(0, 160)
  } catch {
    return null
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

export function doLeadMatchesSearch(
  lead: { email: string; raisonSociale?: string | null },
  query: string
): boolean {
  const folded = foldSearchText(query)
  if (!folded) return true
  if (foldSearchText(lead.email).includes(folded)) return true
  if (foldSearchText(lead.raisonSociale ?? "").includes(folded)) return true
  return false
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
      }
    })
}
