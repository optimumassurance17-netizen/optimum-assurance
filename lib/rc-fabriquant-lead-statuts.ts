/** Statuts internes pour le suivi humain des leads RC Fabriquant (gestion). */

export const RC_FABRIQUANT_LEAD_STATUT_VALUES = [
  "a_traiter",
  "en_cours",
  "proposition_envoyee",
  "refuse",
  "clos",
] as const

export type RcFabriquantLeadStatut = (typeof RC_FABRIQUANT_LEAD_STATUT_VALUES)[number]

export const RC_FABRIQUANT_LEAD_STATUT_LABELS: Record<RcFabriquantLeadStatut, string> = {
  a_traiter: "À traiter",
  en_cours: "En cours",
  proposition_envoyee: "Proposition envoyée",
  refuse: "Refusé",
  clos: "Clos",
}

export function isRcFabriquantLeadStatut(v: string): v is RcFabriquantLeadStatut {
  return (RC_FABRIQUANT_LEAD_STATUT_VALUES as readonly string[]).includes(v)
}

export function normalizeRcFabriquantLeadStatut(v: string | undefined | null): RcFabriquantLeadStatut {
  if (v && isRcFabriquantLeadStatut(v)) return v
  return "a_traiter"
}
