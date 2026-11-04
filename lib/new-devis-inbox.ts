import {
  doDevisLeadRowId,
  readDoLeadCompanyName,
  visibleDoDevisLeads,
} from "@/lib/devis-do-lead"
import { normalizeRcFabriquantLeadStatut } from "@/lib/rc-fabriquant-lead-statuts"
import { isDisplayedQuoteExpired } from "@/lib/quote-validity"

export type NewDevisProduct = "Décennale" | "Dommage ouvrage" | "RC fabriquant" | "Étude" | "Assurance titre"

export type NewDevisInboxItem = {
  key: string
  product: NewDevisProduct
  clientLabel: string
  email: string
  createdAt: string
  listId: string
  clientUserId: string | null
}

type InboxUser = { id: string; email: string; raisonSociale?: string | null }

type DecennaleLead = {
  id: string
  email: string
  raisonSociale?: string | null
  createdAt: string
}

type DoLead = {
  id: string
  email: string
  data?: string | null
  raisonSociale?: string | null
  createdAt: string
}

type RcLead = {
  id: string
  email: string
  data?: string | null
  statut?: string | null
  createdAt: string
  matchedUser?: { id: string; raisonSociale?: string | null } | null
}

type EtudeLead = {
  id: string
  email: string
  raisonSociale?: string | null
  statut?: string | null
  createdAt: string
}

type TitreLead = {
  id: string
  email: string
  data?: string | null
  statut?: string | null
  createdAt: string
  matchedUser?: { id: string; raisonSociale?: string | null } | null
}

function userForEmail(users: InboxUser[], email: string): InboxUser | null {
  const key = email.trim().toLowerCase()
  if (!key) return null
  return users.find((user) => user.email.trim().toLowerCase() === key) ?? null
}

function readNamedField(raw: string | null | undefined): string {
  if (!raw?.trim()) return ""
  try {
    const parsed = JSON.parse(raw) as { raisonSociale?: unknown; nomComplet?: unknown }
    if (typeof parsed.raisonSociale === "string" && parsed.raisonSociale.trim()) return parsed.raisonSociale.trim()
    if (typeof parsed.nomComplet === "string" && parsed.nomComplet.trim()) return parsed.nomComplet.trim()
  } catch {
    return ""
  }
  return ""
}

function labelFrom(...parts: Array<string | null | undefined>): string {
  for (const part of parts) {
    const value = part?.trim()
    if (value) return value
  }
  return "Demande sans nom"
}

function createdTime(value: string): number {
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : 0
}

/** Demandes de devis encore à traiter, la plus récente en premier. */
export function selectNewDevisInbox(
  input: {
    users?: InboxUser[]
    devisLeads?: DecennaleLead[]
    devisDoLeads?: DoLead[]
    devisRcLeads?: RcLead[]
    devisEtudeLeads?: EtudeLead[]
    devisTitreLeads?: TitreLead[]
  },
  now = new Date()
): NewDevisInboxItem[] {
  const users = input.users ?? []
  const knownEmails = new Set(users.map((user) => user.email.trim().toLowerCase()).filter(Boolean))
  const rows: NewDevisInboxItem[] = []

  for (const lead of input.devisLeads ?? []) {
    const email = lead.email.trim()
    if (!email || isDisplayedQuoteExpired(lead.createdAt, now)) continue
    const user = userForEmail(users, email)
    rows.push({
      key: `decennale:${lead.id}`,
      product: "Décennale",
      clientLabel: labelFrom(lead.raisonSociale, email),
      email,
      createdAt: lead.createdAt,
      listId: "leads-decennale",
      clientUserId: user?.id ?? null,
    })
  }

  const openDoLeads = visibleDoDevisLeads(
    (input.devisDoLeads ?? []).map((lead) => ({
      ...lead,
      raisonSociale: lead.raisonSociale ?? readDoLeadCompanyName(lead.data),
    })),
    knownEmails,
    ""
  )
  for (const lead of openDoLeads) {
    if (isDisplayedQuoteExpired(lead.createdAt, now)) continue
    const email = lead.email.trim()
    rows.push({
      key: `do:${lead.id}`,
      product: "Dommage ouvrage",
      clientLabel: labelFrom(lead.raisonSociale, email),
      email,
      createdAt: lead.createdAt,
      listId: doDevisLeadRowId(lead.id),
      clientUserId: null,
    })
  }

  for (const lead of input.devisRcLeads ?? []) {
    const email = lead.email.trim()
    if (!email || isDisplayedQuoteExpired(lead.createdAt, now)) continue
    if (normalizeRcFabriquantLeadStatut(lead.statut) !== "a_traiter") continue
    const user = lead.matchedUser ?? userForEmail(users, email)
    rows.push({
      key: `rc:${lead.id}`,
      product: "RC fabriquant",
      clientLabel: labelFrom(lead.matchedUser?.raisonSociale, readNamedField(lead.data), email),
      email,
      createdAt: lead.createdAt,
      listId: "rc-fabriquant-leads",
      clientUserId: user?.id ?? null,
    })
  }

  for (const lead of input.devisEtudeLeads ?? []) {
    const email = lead.email.trim()
    if (!email || isDisplayedQuoteExpired(lead.createdAt, now)) continue
    if ((lead.statut || "").trim().toLowerCase() !== "pending") continue
    const user = userForEmail(users, email)
    rows.push({
      key: `etude:${lead.id}`,
      product: "Étude",
      clientLabel: labelFrom(lead.raisonSociale, email),
      email,
      createdAt: lead.createdAt,
      listId: "etudes-do",
      clientUserId: user?.id ?? null,
    })
  }

  for (const lead of input.devisTitreLeads ?? []) {
    const email = lead.email.trim()
    if (!email || isDisplayedQuoteExpired(lead.createdAt, now)) continue
    if ((lead.statut || "a_traiter").trim().toLowerCase() !== "a_traiter") continue
    const user = lead.matchedUser ?? userForEmail(users, email)
    rows.push({
      key: `titre:${lead.id}`,
      product: "Assurance titre",
      clientLabel: labelFrom(lead.matchedUser?.raisonSociale, readNamedField(lead.data), email),
      email,
      createdAt: lead.createdAt,
      listId: "assurance-titre-leads",
      clientUserId: user?.id ?? null,
    })
  }

  rows.sort((left, right) => createdTime(right.createdAt) - createdTime(left.createdAt))
  return rows
}
