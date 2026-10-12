/** Libellés et actions DDA lisibles côté client, sans accès base. */

export const DDA_AUDIT_ACTIONS = [
  "dda_advice_acknowledged",
  "dda_contract_suitability_checked",
  "dda_do_payment_suitability_checked",
  "dda_rc_fabriquant_needs_captured",
  "dda_rc_fabriquant_lead_collected",
  "dda_rc_fabriquant_initial_request_logged",
  "dda_rc_fabriquant_proposition_checked",
  "dda_rc_fabriquant_proposition_sent",
  "dda_rc_fabriquant_proposition_suitability_checked",
  "dda_rc_fabriquant_signature_suitability_checked",
  "dda_rc_fabriquant_signature_invited",
  "dda_rc_fabriquant_contract_suitability_checked",
  "dda_rc_fabriquant_contract_created",
  "dda_rc_fabriquant_contract_created_after_signature",
  "dda_avenant_created",
  "dda_avenant_updated",
  "dda_avenant_suitability_checked",
  "dda_document_update_suitability_checked",
] as const

export function ddaProductLabel(value: string | null | undefined): string {
  const normalized = (value ?? "").trim().toLowerCase()
  if (normalized === "decennale") return "Décennale"
  if (normalized === "dommage-ouvrage" || normalized === "dommage_ouvrage" || normalized === "do") {
    return "Dommage ouvrage"
  }
  if (normalized === "rc-fabriquant" || normalized === "rc_fabriquant") return "RC fabricant"
  if (normalized === "rc-pro" || normalized === "rc_pro" || normalized === "rcpro") return "RC Pro"
  if (normalized === "assurance-titre" || normalized === "assurance_titre") return "Assurance titre"
  return value?.trim() || "—"
}

export function ddaProductEmailLabel(value: string): string {
  const normalized = value.trim().toLowerCase()
  if (normalized === "decennale") return "assurance décennale"
  if (normalized === "dommage-ouvrage" || normalized === "dommage_ouvrage" || normalized === "do") {
    return "dommage ouvrage"
  }
  if (normalized === "rc-pro" || normalized === "rc_pro" || normalized === "rcpro") return "RC Pro"
  if (normalized === "assurance-titre" || normalized === "assurance_titre") return "assurance titre"
  if (normalized === "rc-fabriquant" || normalized === "rc_fabriquant") return "RC fabricant"
  return ddaProductLabel(value).toLowerCase()
}

export function ddaTargetTypeLabel(value: string | null | undefined): string {
  const normalized = (value ?? "").trim().toLowerCase()
  if (normalized === "devoir_conseil_log") return "Devoir de conseil"
  if (normalized === "insurance_contract") return "Contrat"
  if (normalized === "document") return "Document"
  if (normalized === "devisrcfabriquantlead") return "Demande RC fabricant"
  if (normalized === "user") return "Fiche client"
  return ""
}

export function ddaPageLabel(value: string | null | undefined): string {
  const normalized = (value ?? "").trim().toLowerCase()
  if (normalized === "souscription") return "Souscription"
  if (normalized === "souscription_do") return "Souscription DO"
  if (normalized === "signature") return "Signature"
  if (normalized === "formulaire_do") return "Formulaire DO"
  if (normalized === "paiement_do") return "Paiement DO"
  if (normalized === "devis_rc_fabriquant") return "Devis RC fabricant"
  if (normalized === "proposition_rc_fabriquant") return "Proposition RC fabricant"
  if (normalized === "signature_rc_fabriquant") return "Signature RC fabricant"
  if (normalized === "rc_fabriquant_result") return "Résultat RC fabricant"
  if (normalized === "avenant_create") return "Création avenant"
  if (normalized === "avenant_update") return "Mise à jour avenant"
  if (normalized === "rc_pro_result" || normalized === "rc-pro-result") return "Résultat RC Pro"
  if (
    normalized === "assurance_titre" ||
    normalized === "assurance-titre" ||
    normalized === "formulaire_assurance_titre"
  ) {
    return "Demande assurance titre"
  }
  return value?.trim() || "—"
}
