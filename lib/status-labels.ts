const STATUS_LABELS: Record<string, string> = {
  valide: "Valide",
  suspendu: "Suspendu",
  resilie: "Résilié",
  perimee: "Périmée",
  draft: "Brouillon",
  pending_validation: "En validation",
  approved: "Approuvé",
  paid: "Payé",
  active: "Actif",
  rejected: "Refusé",
  pending: "En attente",
  failed: "Échoué",
  open: "En attente",
  authorized: "Autorisé",
  expired: "Expiré",
  canceled: "Annulé",
  cancelled: "Annulé",
  unpaid: "À régler",
  inactive: "Non actif",
  ready: "Disponible",
  completed: "Terminé",
  pending_mandate: "Mandat en attente",
}

/** Libellé français d’un code de statut technique, pour l’affichage. */
export function frenchStatusLabel(status: string | null | undefined): string {
  const raw = (status ?? "").trim()
  if (!raw) return ""
  return STATUS_LABELS[raw] ?? raw
}
