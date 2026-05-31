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

export const LINKPILOT_GUARDRAILS = {
  maxDraftGenerationPerMinute: 20,
  forbidAutoSend: true,
  forbidForumAutopost: true,
  requireAdminValidation: true,
} as const
