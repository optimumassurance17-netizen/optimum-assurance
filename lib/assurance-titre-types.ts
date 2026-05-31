export type AssuranceTitreProfilSouscripteur =
  | "particulier"
  | "investisseur"
  | "marchand_biens"
  | "promoteur_fonciere"
  | "banque_preteur"
  | "notaire_avocat"
  | "autre"

export type AssuranceTitreTypeOperation =
  | "acquisition"
  | "vente_cession"
  | "refinancement"
  | "garantie_preteur"
  | "audit_avant_signature"
  | "regularisation_apres_decouverte"
  | "autre"

export type AssuranceTitreTypeBien =
  | "appartement"
  | "maison"
  | "immeuble"
  | "locaux_commerciaux"
  | "terrain"
  | "portefeuille"
  | "actif_mixte"
  | "autre"

export type AssuranceTitreBesoinPrincipal =
  | "securisation_transaction"
  | "anomalie_identifiee"
  | "garantie_preteur"
  | "closing_complexe"
  | "analyse_generale"

export type AssuranceTitreRisqueIdentifie =
  | "servitude_non_declaree"
  | "hypotheque_charge"
  | "erreur_cadastrale"
  | "empietement_limites"
  | "absence_acces"
  | "fraude_usurpation"
  | "litige_propriete"
  | "erreur_publicite_fonciere"
  | "autre"

export type AssuranceTitreData = {
  nomComplet: string
  raisonSociale?: string
  siret?: string
  telephone: string
  profilSouscripteur: AssuranceTitreProfilSouscripteur
  typeOperation: AssuranceTitreTypeOperation
  typeBien: AssuranceTitreTypeBien
  besoinPrincipal: AssuranceTitreBesoinPrincipal
  adresseBien: string
  codePostalBien: string
  villeBien: string
  montantOperation: number
  dateSignaturePrevue?: string
  financementExterne: boolean
  risquesIdentifies: AssuranceTitreRisqueIdentifie[]
  message?: string
}

export const ASSURANCE_TITRE_PROFIL_OPTIONS: Array<{
  value: AssuranceTitreProfilSouscripteur
  label: string
}> = [
  { value: "particulier", label: "Particulier / acquéreur" },
  { value: "investisseur", label: "Investisseur" },
  { value: "marchand_biens", label: "Marchand de biens" },
  { value: "promoteur_fonciere", label: "Promoteur / foncière" },
  { value: "banque_preteur", label: "Banque / prêteur" },
  { value: "notaire_avocat", label: "Notaire / avocat" },
  { value: "autre", label: "Autre profil" },
]

export const ASSURANCE_TITRE_OPERATION_OPTIONS: Array<{
  value: AssuranceTitreTypeOperation
  label: string
}> = [
  { value: "acquisition", label: "Acquisition" },
  { value: "vente_cession", label: "Vente / cession sécurisée" },
  { value: "refinancement", label: "Refinancement" },
  { value: "garantie_preteur", label: "Garantie prêteur" },
  { value: "audit_avant_signature", label: "Audit avant signature" },
  { value: "regularisation_apres_decouverte", label: "Régularisation après découverte d'une anomalie" },
  { value: "autre", label: "Autre opération" },
]

export const ASSURANCE_TITRE_BIEN_OPTIONS: Array<{
  value: AssuranceTitreTypeBien
  label: string
}> = [
  { value: "appartement", label: "Appartement" },
  { value: "maison", label: "Maison" },
  { value: "immeuble", label: "Immeuble entier" },
  { value: "locaux_commerciaux", label: "Locaux commerciaux / tertiaire" },
  { value: "terrain", label: "Terrain" },
  { value: "portefeuille", label: "Portefeuille d'actifs" },
  { value: "actif_mixte", label: "Actif mixte" },
  { value: "autre", label: "Autre bien" },
]

export const ASSURANCE_TITRE_BESOIN_OPTIONS: Array<{
  value: AssuranceTitreBesoinPrincipal
  label: string
}> = [
  { value: "securisation_transaction", label: "Sécuriser la transaction avant signature" },
  { value: "anomalie_identifiee", label: "Couvrir une anomalie déjà identifiée" },
  { value: "garantie_preteur", label: "Rassurer un prêteur / investisseur" },
  { value: "closing_complexe", label: "Fluidifier un closing complexe" },
  { value: "analyse_generale", label: "Analyse générale du dossier" },
]

export const ASSURANCE_TITRE_RISQUE_OPTIONS: Array<{
  value: AssuranceTitreRisqueIdentifie
  label: string
}> = [
  { value: "servitude_non_declaree", label: "Servitude ou droit réel non déclaré" },
  { value: "hypotheque_charge", label: "Hypothèque / charge non radiée" },
  { value: "erreur_cadastrale", label: "Erreur cadastrale / de désignation" },
  { value: "empietement_limites", label: "Empiètement / limite de propriété" },
  { value: "absence_acces", label: "Absence ou incertitude sur l'accès" },
  { value: "fraude_usurpation", label: "Fraude / usurpation d'identité" },
  { value: "litige_propriete", label: "Litige sur la propriété / revendication d'un tiers" },
  { value: "erreur_publicite_fonciere", label: "Erreur de publicité foncière / inscription" },
  { value: "autre", label: "Autre point de vigilance" },
]

export const ASSURANCE_TITRE_PROFIL_LABELS: Record<
  AssuranceTitreProfilSouscripteur,
  string
> = Object.fromEntries(
  ASSURANCE_TITRE_PROFIL_OPTIONS.map((option) => [option.value, option.label])
) as Record<AssuranceTitreProfilSouscripteur, string>

export const ASSURANCE_TITRE_OPERATION_LABELS: Record<
  AssuranceTitreTypeOperation,
  string
> = Object.fromEntries(
  ASSURANCE_TITRE_OPERATION_OPTIONS.map((option) => [option.value, option.label])
) as Record<AssuranceTitreTypeOperation, string>

export const ASSURANCE_TITRE_BIEN_LABELS: Record<AssuranceTitreTypeBien, string> = Object.fromEntries(
  ASSURANCE_TITRE_BIEN_OPTIONS.map((option) => [option.value, option.label])
) as Record<AssuranceTitreTypeBien, string>

export const ASSURANCE_TITRE_BESOIN_LABELS: Record<
  AssuranceTitreBesoinPrincipal,
  string
> = Object.fromEntries(
  ASSURANCE_TITRE_BESOIN_OPTIONS.map((option) => [option.value, option.label])
) as Record<AssuranceTitreBesoinPrincipal, string>

export const ASSURANCE_TITRE_RISQUE_LABELS: Record<
  AssuranceTitreRisqueIdentifie,
  string
> = Object.fromEntries(
  ASSURANCE_TITRE_RISQUE_OPTIONS.map((option) => [option.value, option.label])
) as Record<AssuranceTitreRisqueIdentifie, string>
