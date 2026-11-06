export const LINKPILOT_STATUSES = [
  "new",
  "qualified",
  "contacted",
  "replied",
  "accepted",
  "rejected",
  "acquired",
] as const

export const LINKPILOT_CATEGORIES = [
  "blog_btp",
  "annuaire_artisan",
  "media_construction",
  "courtier_assurance",
  "expert_comptable",
  "organisme_professionnel",
  "partenaire_local",
  "autre",
] as const

export const LINKPILOT_CAMPAIGN_STATUSES = ["draft", "active", "paused", "completed"] as const

export const LINKPILOT_EMAIL_DRAFT_STATUSES = [
  "draft",
  "ready_for_review",
  "approved",
  "sent",
  "failed",
] as const

export const LINKPILOT_BACKLINK_TYPES = ["dofollow", "nofollow", "sponsored", "ugc"] as const
export const LINKPILOT_BACKLINK_STATUSES = ["active", "lost", "pending"] as const

export const NATURAL_ANCHOR_SUGGESTIONS = [
  "Optimum Assurance",
  "guide assurance décennale",
  "assurance décennale pour artisans",
  "simulateur assurance décennale",
  "voir le guide complet",
  "source utile sur l’assurance décennale",
] as const

export const LINKABLE_ASSETS = [
  "/assurance-decennale",
  "/assurance-decennale-auto-entrepreneur",
  "/assurance-decennale-artisan",
  "/assurance-decennale-macon",
  "/assurance-decennale-electricien",
  "/assurance-decennale-plombier",
  "/assurance-decennale-couvreur",
  "/assurance-decennale-menuisier",
  "/assurance-dommage-ouvrage",
  "/guides/assurance-decennale",
  "/outils/simulateur-assurance-decennale",
] as const

const LINKPILOT_STATUS_LABELS: Record<string, string> = {
  new: "Nouveau",
  qualified: "Qualifié",
  contacted: "Contacté",
  replied: "Répondu",
  accepted: "Accepté",
  rejected: "Refusé",
  acquired: "Obtenu",
  draft: "Brouillon",
  active: "Actif",
  paused: "En pause",
  completed: "Terminé",
  lost: "Perdu",
  pending: "En attente",
  ready_for_review: "À relire",
  approved: "Approuvé",
  failed: "Échec",
  sent: "Envoyé",
  open: "Ouvert",
  acknowledged: "Pris en compte",
  resolved: "Résolu",
}

const LINKPILOT_CATEGORY_LABELS: Record<(typeof LINKPILOT_CATEGORIES)[number], string> = {
  blog_btp: "Blog BTP",
  annuaire_artisan: "Annuaire artisan",
  media_construction: "Média construction",
  courtier_assurance: "Courtier d'assurance",
  expert_comptable: "Expert-comptable",
  organisme_professionnel: "Organisme professionnel",
  partenaire_local: "Partenaire local",
  autre: "Autre",
}

const LINKPILOT_BACKLINK_TYPE_LABELS: Record<(typeof LINKPILOT_BACKLINK_TYPES)[number], string> = {
  dofollow: "Lien suivi",
  nofollow: "Lien non suivi",
  sponsored: "Lien sponsorisé",
  ugc: "Contenu utilisateur",
}

export function linkPilotStatusLabel(status: string): string {
  return LINKPILOT_STATUS_LABELS[status] ?? status
}

export function linkPilotCategoryLabel(category: string): string {
  return LINKPILOT_CATEGORY_LABELS[category as (typeof LINKPILOT_CATEGORIES)[number]] ?? category.replaceAll("_", " ")
}

export function linkPilotBacklinkTypeLabel(type: string): string {
  return LINKPILOT_BACKLINK_TYPE_LABELS[type as (typeof LINKPILOT_BACKLINK_TYPES)[number]] ?? type
}

export const LINKPILOT_GUARDRAILS = {
  maxDraftGenerationPerMinute: 20,
  forbidAutoSend: true,
  forbidForumAutopost: true,
  requireAdminValidation: true,
} as const
