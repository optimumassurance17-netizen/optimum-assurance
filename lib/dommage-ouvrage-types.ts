/** Types pour le questionnaire devis dommage ouvrage (basé sur DO-Questionnaire-NTP) */

export type QualiteMaitreOuvrage =
  | "promoteur"
  | "mandataire"
  | "particulier_habitation"
  | "particulier_locatif"
  | "particulier_revente"
  | "autre"

export type TypeOuvrage =
  | "maison_individuelle"
  | "maison_jumelee"
  | "immeuble_logements"
  | "immeuble_logements_commerces"
  | "immeuble_bureaux"
  | "etablissement_soins_sportif_culturel"
  | "batiment_industriel"
  | "autre"

export type DestinationConstruction = "location" | "vente" | "exploitation_directe"

export type GarantieSouhaitee = "do" | "cnr" | "trc" | "rcmo"

export type TypeContrat = "contractant_general" | "corps_etat_separes" | "cmi" | "entreprise_generale" | "groupement"

export interface DevisDommageOuvrageData {
  // 1. Présentation du souscripteur
  siret?: string
  raisonSociale: string
  adresse: string
  codePostal: string
  ville: string
  telephone: string
  email: string
  qualiteMaitreOuvrage: QualiteMaitreOuvrage
  qualiteAutre?: string
  maitreOuvrageEstSouscripteur: boolean
  proposantCoordonnees?: string

  // 2. Caractéristiques de l'opération
  adresseConstruction: string
  codePostalConstruction: string
  villeConstruction: string
  permisConstruireNumero: string
  dateDroc: string
  dateDebutTravaux: string
  dateAchevementTravaux: string
  surfaceConstruction: number

  // 3. Type d'ouvrage
  typeOuvrage: TypeOuvrage
  superficieOuvrage: number
  nbLogements?: number
  nbCommerces?: number
  superficieCommerces?: number
  destinationConstruction: DestinationConstruction
  operationClosCouvert: boolean
  habitationPrincipaleSecondaire: boolean
  nbBatiments: number
  nbEtages: number
  nbSousSols: number
  garages: boolean
  caves: boolean
  piscines: boolean
  photovoltaiques: boolean
  photovoltaiquesType?: "integres" | "surimposes"

  // 4. Coût prévisionnel (€)
  coutTravauxVrd: number
  coutMateriauxMaitreOuvrage: number
  coutControleTechnique: number
  coutEtudeSol: number
  coutMaitriseOeuvre: number
  coutTvaIncluse: boolean

  // 5. Caractéristiques techniques
  etudeBetonArme: boolean
  techniqueCourante: boolean
  produitsAvisTechnique: boolean
  vitragesAgrafesColles: boolean

  // 6. Caractéristiques du terrain
  distanceMerMoins300m: boolean
  solRemblaiRecent: boolean
  solRemblaisInstables: boolean
  solArgileGonflante: boolean
  solTourbeVaseArgile: boolean
  solGaleriesMinesDecharges: boolean
  altitudeSup1000m: boolean
  merMoins500m: boolean
  terrainEnPente: boolean
  penteTerrain?: "inf15" | "sup15" | "sup30"

  // 7. Existants
  travauxNeufsAvecExistants: boolean
  existantsTravauxEtancheite: boolean
  existantsFondationsOssature: boolean
  existantsSuppressionPorteurs: boolean
  existantsSousSolSupplementaire: boolean
  existantsSurelevation: boolean
  existantsReprisesSousOeuvre: boolean
  existantsRetraitAmiantePlomb: boolean
  existantsIsolationExterieure: boolean
  existantsAnneeConstruction?: number
  existantsValeurApproximative?: number

  // 8. Garanties souhaitées
  garanties: GarantieSouhaitee[]
  dommagesBiensEquipement: boolean
  dommagesExistants: boolean
  reprisePasse: boolean // jusqu'à 2 ans en arrière — soumis à étude

  // 9. Maîtrise d'œuvre
  maitriseOeuvreProfessionnel: boolean
  maitriseOeuvreNom: string
  maitriseOeuvreAdresse: string
  maitriseOeuvreCodePostal: string
  maitriseOeuvreVille: string
  maitriseOeuvreTelephone: string
  maitriseOeuvreQualite: string
  maitriseOeuvreConception: boolean
  maitriseOeuvreDirectionSurveillance: boolean
  maitriseOeuvreMissionComplete: boolean
  maitreOuvrageRealiseTravaux: boolean
  maitreOuvrageQuelsTravaux?: string
  maitreOuvrageQualification?: string

  // 10. Contrôle technique
  controleTechnique: boolean
  controleTechniqueNom?: string
  controleTechniqueType?: "L" | "L+E" | "A" | "E" | "autre"
  controleTechniqueAutre?: string

  // 11. Étude de sol
  etudeSol: boolean

  // 12. Réalisation
  typeContrat: TypeContrat
  commentaires?: string
}

export const QUALITES_MAITRE_OUVRAGE: { value: QualiteMaitreOuvrage; label: string }[] = [
  { value: "promoteur", label: "Promoteur immobilier, vendeur après achèvement, vendeur d'immeubles à construire" },
  { value: "mandataire", label: "Mandataire du propriétaire de l'ouvrage" },
  { value: "particulier_habitation", label: "Particulier faisant construire pour son compte à usage d'habitation" },
  { value: "particulier_locatif", label: "Particulier faisant construire pour son compte à usage locatif" },
  { value: "particulier_revente", label: "Particulier faisant construire pour son compte à usage de revente" },
  { value: "autre", label: "Autre qualité" },
]

export const TYPES_OUVRAGE: { value: TypeOuvrage; label: string }[] = [
  { value: "maison_individuelle", label: "Maison individuelle isolée" },
  { value: "maison_jumelee", label: "Maison jumelée (toiture unique)" },
  { value: "immeuble_logements", label: "Immeuble logements collectifs" },
  { value: "immeuble_logements_commerces", label: "Immeuble logements et commerces" },
  { value: "immeuble_bureaux", label: "Immeuble de bureaux" },
  { value: "etablissement_soins_sportif_culturel", label: "Établissement de soins, sportif ou culturel" },
  { value: "batiment_industriel", label: "Bâtiment industriel" },
  { value: "autre", label: "Autres (chalets bois, groupe de maisons, etc.)" },
]

export const GARANTIES_LABELS: Record<GarantieSouhaitee, string> = {
  do: "Dommages ouvrage (DO)",
  cnr: "CNR",
  trc: "TRC (Maître d'ouvrage seul)",
  rcmo: "RC Maître d'ouvrage",
}

export const TYPES_CONTRAT: { value: TypeContrat; label: string }[] = [
  { value: "contractant_general", label: "Contractant général" },
  { value: "corps_etat_separes", label: "Par corps d'état séparés" },
  { value: "cmi", label: "CMI" },
  { value: "entreprise_generale", label: "Entreprise générale tous corps d'états" },
  { value: "groupement", label: "Groupement d'entreprises" },
]
