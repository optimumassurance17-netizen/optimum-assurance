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
  user_update: "Fiche client mise à jour",
  user_client_access_sent: "Accès client envoyé",
  user_create_from_lead: "Compte client créé",
}

const SAFE_USER_ID = /^[A-Za-z0-9_-]{8,80}$/

export function adminActivityLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
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
