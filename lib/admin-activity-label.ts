const ACTION_LABELS: Record<string, string> = {
  echeance_refus_sepa_prevenu: "Client prévenu du refus de prélèvement",
  echeance_lien_carte: "Lien carte envoyé",
  echeance_virement_externe: "Virement externe validé",
  echeance_marquee_reglee: "Échéance marquée réglée",
  payment_paid: "Paiement confirmé",
  payment_rectified: "Paiement rectifié",
  installment_paid: "Échéance de contrat payée",
  regularisation_attestation_restored: "Attestation régularisée",
  impaye_relance_email: "Relance d'impayé envoyée",
  user_delete: "Compte client supprimé",
  clients_fusionnes: "Comptes fusionnés",
  note_created: "Note ajoutée",
  email_sent: "Email envoyé au client",
  signature_relance_manuelle: "Signature électronique relancée",
  cron_signature_reminder_client_sent: "Rappel de signature envoyé",
  signature_send_from_devis: "Invitation de signature envoyée",
  pending_signature_cancelled: "Demande de signature annulée",
  status_change: "Statut de document modifié",
  resiliation: "Document résilié",
  attestation_decennale_generated_by_admin: "Attestation décennale générée",
  user_update: "Fiche client mise à jour",
  user_client_access_sent: "Accès client envoyé",
  user_create_from_lead: "Compte client créé",
}

const SAFE_USER_ID = /^[A-Za-z0-9_-]{8,80}$/

export function adminActivityLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

export type ClientActivityItem = {
  id: string
  action: string
  actionLabel: string
  adminEmail: string
  createdAt: string
}

/** Journal de la fiche, lecture seule. */
export function describeClientActivity(
  logs: { id: string; action: string; adminEmail: string; createdAt: Date | string }[]
): ClientActivityItem[] {
  const items: ClientActivityItem[] = []
  for (const log of logs) {
    const date = log.createdAt instanceof Date ? log.createdAt : new Date(log.createdAt)
    if (!log.id || Number.isNaN(date.getTime())) continue
    items.push({
      id: log.id,
      action: log.action,
      actionLabel: adminActivityLabel(log.action),
      adminEmail: log.adminEmail,
      createdAt: date.toISOString(),
    })
  }
  return items
}

function userIdFromDetails(details: string | null | undefined): string | null {
  if (!details?.trim()) return null
  try {
    const parsed = JSON.parse(details) as Record<string, unknown>
    const userId = parsed.userId
    return typeof userId === "string" && userId.trim() ? userId.trim() : null
  } catch {
    return null
  }
}

/** Lien vers la fiche quand la cible est un compte client. */
export function adminActivityClientHref(log: {
  targetType?: string | null
  targetId?: string | null
  details?: string | null
}): string | null {
  const direct = log.targetType === "user" ? log.targetId?.trim() || "" : ""
  const fromDetails = userIdFromDetails(log.details) || ""
  const userId = SAFE_USER_ID.test(direct) ? direct : SAFE_USER_ID.test(fromDetails) ? fromDetails : ""
  return userId ? `/gestion/clients/${userId}` : null
}
