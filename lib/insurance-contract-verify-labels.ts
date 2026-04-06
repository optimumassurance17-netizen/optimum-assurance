import type { InsuranceContract } from "@prisma/client"
import { CONTRACT_STATUS } from "@/lib/insurance-contract-status"

export type VerifyPaymentRow = {
  /** Libellé court pour la ligne « Paiement » */
  label: string
  /** Texte complémentaire (encadré sous le bandeau si contrat non valide) */
  detail?: string
}

/**
 * Libellés lisibles pour la page publique /verify (QR code) — sans jargon technique.
 */
export function getVerifyPaymentRow(ic: InsuranceContract, isGarantieActive: boolean): VerifyPaymentRow {
  if (ic.status === CONTRACT_STATUS.rejected) {
    return {
      label: "Non finalisé (contrat refusé)",
      detail:
        "Contrat refusé — aucun paiement valide n’a été enregistré pour ce dossier. L’attestation n’est pas opposable.",
    }
  }

  if (ic.status === CONTRACT_STATUS.pending_validation) {
    return {
      label: "Non demandé — validation assureur en cours",
      detail:
        "En attente d’acceptation par l’assureur. Le paiement sera demandé après validation du dossier.",
    }
  }

  if (ic.status === CONTRACT_STATUS.approved) {
    return {
      label: "En attente de règlement (paiement non reçu)",
      detail:
        "Paiement en attente côté souscripteur : l’attestation et la garantie ne prennent effet qu’après encaissement.",
    }
  }

  if (ic.status === CONTRACT_STATUS.active && ic.paidAt) {
    const dateStr = ic.paidAt.toLocaleDateString("fr-FR")
    if (isGarantieActive) {
      return { label: `Reçu le ${dateStr}` }
    }
    return {
      label: `Reçu le ${dateStr}`,
      detail:
        "Le règlement a bien été enregistré, mais la période de garantie est terminée ou le contrat n’est plus actif à la date du jour.",
    }
  }

  if (ic.paidAt) {
    return {
      label: `Reçu le ${ic.paidAt.toLocaleDateString("fr-FR")}`,
      detail: "Situation inhabituelle — contactez votre conseiller en cas de doute.",
    }
  }

  return {
    label: "Non finalisé",
    detail: "Aucun encaissement enregistré pour ce dossier.",
  }
}
