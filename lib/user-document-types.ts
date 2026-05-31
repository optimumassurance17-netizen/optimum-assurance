// Documents décennale
export const DOC_TYPES_DECENNALE = [
  "kbis",
  "piece_identite",
  "justificatif_activite",
  "qualification",
  "rib",
  "releve_sinistralite",
] as const

// Documents dommage ouvrage
export const DOC_TYPES_DO = [
  "permis_construire",
  "doc_droc",
  "plans_construction",
  "convention_maitrise_oeuvre",
  "convention_controle_technique",
  "rapport_etude_sol",
] as const

// Documents assurance titre
export const DOC_TYPES_TITRE = [
  "titre_propriete",
  "projet_acte",
  "etat_hypothecaire",
  "plan_cadastral",
  "piece_identite_titre",
  "note_notaire",
] as const

export const UPLOAD_DOC_TYPES = [...DOC_TYPES_DECENNALE, ...DOC_TYPES_DO, ...DOC_TYPES_TITRE] as const

export const UPLOAD_DOC_LABELS: Record<(typeof UPLOAD_DOC_TYPES)[number], string> = {
  kbis: "KBIS de moins de 3 mois",
  piece_identite: "Pièce d'identité",
  justificatif_activite: "Justificatif d'activité (diplôme ou certificat de travail)",
  qualification: "Qualification (RGE, QUALIBAT, etc.)",
  rib: "RIB",
  releve_sinistralite: "Relevé de sinistralité",
  permis_construire: "Permis de construire (dommage ouvrage)",
  doc_droc: "DOC / DROC (dommage ouvrage)",
  plans_construction: "Plans construction (dommage ouvrage)",
  convention_maitrise_oeuvre: "Convention maîtrise d'œuvre (dommage ouvrage)",
  convention_controle_technique: "Convention contrôle technique (dommage ouvrage)",
  rapport_etude_sol: "Rapport étude de sol (dommage ouvrage)",
  titre_propriete: "Titre de propriété / origine de propriété",
  projet_acte: "Projet d'acte / promesse / compromis",
  etat_hypothecaire: "État hypothécaire / inscriptions",
  plan_cadastral: "Plan cadastral / extrait parcellaire",
  piece_identite_titre: "Pièce d'identité des parties (Assurance titre)",
  note_notaire: "Note du notaire / observations juridiques",
}
