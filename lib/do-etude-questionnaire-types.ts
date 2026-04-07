/**
 * Questionnaire d’étude DO — espace client uniquement (après 1ère demande devis).
 * Stocké en JSON (`User.doEtudeQuestionnaireJson`).
 */
export const DO_ETUDE_VERSION = 1 as const

export type OuiNon = "oui" | "non" | ""

export interface DoEtudeQuestionnaireV1 {
  version: typeof DO_ETUDE_VERSION
  souscripteur: {
    nomRaisonSociale: string
    adresse: string
    codePostal: string
    ville: string
    telephone: string
    email: string
    maitreOuvrageEstSouscripteur: OuiNon
    qualiteMaitreOuvrage: "particulier" | "promoteur" | "sci" | "autre" | ""
    qualiteAutre: string
  }
  operation: {
    adresseChantier: string
    codePostal: string
    ville: string
    permisNumero: string
    dateDoc: string
    dateDebutTravaux: string
    dateFinTravaux: string
  }
  typeProjet: {
    typeBatiment: "maison" | "immeuble" | "autre" | ""
    typeBatimentAutre: string
    destination: "vente" | "location" | "personnel" | ""
    superficieM2: string
    nbBatiments: string
    nbEtages: string
    nbGarages: string
    nbCaves: string
    piscine: OuiNon
    photovoltaiques: OuiNon
  }
  cout: {
    coutTotalTtc: string
    dontTravaux: string
    dontHonorairesMO: string
    dontEtudeSol: string
    dontControleTechnique: string
  }
  tech: {
    typeFondation: "semelles" | "radier" | "pieux" | "autre" | ""
    typeFondationAutre: string
    etudeBetonArme: OuiNon
    techniqueCourante: OuiNon
    produitsAtex: OuiNon
    porteeSup7m: OuiNon
  }
  environnement: {
    zoneInondable: OuiNon
    solRemblai: OuiNon
    argileGonflante: OuiNon
    nappeElevee: OuiNon
    penteSup15: OuiNon
  }
  travauxSpecifiques: {
    travauxSurExistant: OuiNon
    etancheiteSpecifique: OuiNon
    interventionStructure: OuiNon
    surelevation: OuiNon
    desamiantage: OuiNon
  }
  garanties: {
    do: boolean
    trc: boolean
    rcmo: boolean
    dommagesExistants: boolean
  }
  intervenants: {
    maitriseOeuvreNom: string
    maitriseOeuvreAssureur: string
    maitriseOeuvrePolice: string
    maitriseOeuvreMontantMission: string
    bureauControleNom: string
    etudeSolSociete: string
  }
  lots: { lot: string; entreprise: string; assureur: string; police: string; siren: string; montant: string }[]
  documents: {
    avant: string[]
    apres: string[]
  }
  validation: {
    faitA: string
    le: string
    nom: string
  }
}

export const DO_ETUDE_DOCUMENTS_AVANT = [
  "permis",
  "plans",
  "devis",
  "planning",
  "etude_sol",
  "attestations_decennales",
] as const

export const DO_ETUDE_DOCUMENTS_APRES = ["pv_reception", "rapport_ct"] as const

export function emptyDoEtudeQuestionnaire(): DoEtudeQuestionnaireV1 {
  return {
    version: DO_ETUDE_VERSION,
    souscripteur: {
      nomRaisonSociale: "",
      adresse: "",
      codePostal: "",
      ville: "",
      telephone: "",
      email: "",
      maitreOuvrageEstSouscripteur: "",
      qualiteMaitreOuvrage: "",
      qualiteAutre: "",
    },
    operation: {
      adresseChantier: "",
      codePostal: "",
      ville: "",
      permisNumero: "",
      dateDoc: "",
      dateDebutTravaux: "",
      dateFinTravaux: "",
    },
    typeProjet: {
      typeBatiment: "",
      typeBatimentAutre: "",
      destination: "",
      superficieM2: "",
      nbBatiments: "",
      nbEtages: "",
      nbGarages: "",
      nbCaves: "",
      piscine: "",
      photovoltaiques: "",
    },
    cout: {
      coutTotalTtc: "",
      dontTravaux: "",
      dontHonorairesMO: "",
      dontEtudeSol: "",
      dontControleTechnique: "",
    },
    tech: {
      typeFondation: "",
      typeFondationAutre: "",
      etudeBetonArme: "",
      techniqueCourante: "",
      produitsAtex: "",
      porteeSup7m: "",
    },
    environnement: {
      zoneInondable: "",
      solRemblai: "",
      argileGonflante: "",
      nappeElevee: "",
      penteSup15: "",
    },
    travauxSpecifiques: {
      travauxSurExistant: "",
      etancheiteSpecifique: "",
      interventionStructure: "",
      surelevation: "",
      desamiantage: "",
    },
    garanties: { do: false, trc: false, rcmo: false, dommagesExistants: false },
    intervenants: {
      maitriseOeuvreNom: "",
      maitriseOeuvreAssureur: "",
      maitriseOeuvrePolice: "",
      maitriseOeuvreMontantMission: "",
      bureauControleNom: "",
      etudeSolSociete: "",
    },
    lots: [{ lot: "", entreprise: "", assureur: "", police: "", siren: "", montant: "" }],
    documents: { avant: [], apres: [] },
    validation: { faitA: "", le: "", nom: "" },
  }
}
